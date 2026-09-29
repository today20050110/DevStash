import { createHash, randomBytes } from "node:crypto";

/** 放進信件連結的原文 token；資料庫只存 hashToken() 的結果 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// 資料庫只存雜湊：資料外洩時拿不到可用的連結
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 信件連結的網址根。不從請求的 Host header 推導：Host 可被偽造，
 * 會讓信裡的連結指向攻擊者的網域而洩漏 token。
 * 優先用 APP_URL，其次是 Vercel 自動提供的正式網域，最後是本機。
 */
export function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
