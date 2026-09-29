import { createHash } from "node:crypto";

import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/** 各動作的限制（sliding window）。鍵由呼叫端組成：IP、ipEmailKey() 或 userId */
const LIMITS = {
  // IP + email
  signIn: { tokens: 5, window: "15 m" },
  // IP
  register: { tokens: 3, window: "1 h" },
  // IP
  forgotPassword: { tokens: 3, window: "1 h" },
  // IP
  resetPassword: { tokens: 5, window: "15 m" },
  // IP + email
  resendVerification: { tokens: 3, window: "15 m" },
  // userId：已登入的人可以用它猜目前的密碼
  changePassword: { tokens: 5, window: "15 m" },
} satisfies Record<string, { tokens: number; window: Duration }>;

export type RateLimitAction = keyof typeof LIMITS;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** 限制解除的時間（Unix 毫秒） */
  reset: number;
}

// Upstash 太慢時放行，不讓登入卡住（SDK 在逾時時回 success: true）
const REDIS_TIMEOUT_MS = 1000;

let redis: Redis | null | undefined;
const limiters = new Map<RateLimitAction, Ratelimit>();

/**
 * Production／Preview 用 Vercel 整合設定的 KV_REST_API_URL／KV_REST_API_TOKEN；
 * Development 用另一個資料庫的 UPSTASH_REDIS_REST_URL／UPSTASH_REDIS_REST_TOKEN，
 * 本機測試不會鎖住正式網站的使用者。KV_* 優先，所以不用 Redis.fromEnv()
 * （它只讀 UPSTASH_*）。都沒有設定時回傳 null，所有限制放行。
 */
function getRedis(): Redis | null {
  if (redis === undefined) {
    const url =
      process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
    const token =
      process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
    redis = url && token ? new Redis({ url, token }) : null;
  }
  return redis;
}

function getLimiter(action: RateLimitAction): Ratelimit | null {
  const client = getRedis();
  if (!client) {
    return null;
  }
  let limiter = limiters.get(action);
  if (!limiter) {
    const { tokens, window } = LIMITS[action];
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(tokens, window),
      prefix: `devstash:ratelimit:${action}`,
      timeout: REDIS_TIMEOUT_MS,
    });
    limiters.set(action, limiter);
  }
  return limiter;
}

/**
 * Fail open：沒有設定 Upstash、連線失敗或逾時都放行並記錄 log。
 * 速率限制是防護的一層，不該因為它故障讓所有人都無法登入。
 */
export async function checkRateLimit(
  action: RateLimitAction,
  key: string,
): Promise<RateLimitResult> {
  const allowed = { success: true, remaining: LIMITS[action].tokens, reset: 0 };
  const limiter = getLimiter(action);
  if (!limiter) {
    return allowed;
  }
  try {
    const { success, remaining, reset, reason } = await limiter.limit(key);
    if (reason === "timeout") {
      console.warn(`Rate limit check timed out for ${action}; allowing`);
    }
    return { success, remaining, reset };
  } catch (error) {
    console.error(`Rate limit check failed for ${action}; allowing`, error);
    return allowed;
  }
}

/**
 * 客戶端 IP。Vercel 會以真實 IP 覆寫 x-forwarded-for 且不轉發外部傳入的值，
 * 使用者無法偽造（https://vercel.com/docs/headers/request-headers）；
 * x-real-ip 與它相同。本機直接連線時可以偽造，但不影響 production。
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** IP + email 的鍵。email 先做 SHA-256，Redis 裡不留明文 email */
export function ipEmailKey(ip: string, email: string): string {
  const emailHash = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `${ip}:${emailHash}`;
}

/** 距離限制解除的秒數，至少 1 秒；給 Retry-After header 用 */
export function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

export function rateLimitMessage(reset: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds(reset) / 60));
  const unit = minutes === 1 ? "minute" : "minutes";
  return `Too many attempts. Please try again in ${minutes} ${unit}.`;
}

/** Server action 沒有 Request 物件，從 next/headers 取得同樣的 header */
export async function getActionClientIp(): Promise<string> {
  return getClientIp(await headers());
}
