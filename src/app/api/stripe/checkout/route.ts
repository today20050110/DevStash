import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/current-user";
import { getStripeCustomerId, saveStripeCustomerId } from "@/lib/db/billing";
import {
  checkRateLimit,
  rateLimitMessage,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/tokens";

/** 用戶端只送方案名稱，price id 留在伺服器端，避免被換成別的價格 */
const checkoutSchema = z.object({ plan: z.enum(["monthly", "yearly"]) });

const PRICE_ENV = {
  monthly: "STRIPE_PRICE_ID_MONTHLY",
  yearly: "STRIPE_PRICE_ID_YEARLY",
} as const;

/** 沒有 customer 就建立；同時兩個請求各建一個時，只有先寫入的會被採用 */
async function ensureCustomer(userId: string, email: string): Promise<string> {
  const existing = await getStripeCustomerId(userId);
  if (existing) {
    return existing;
  }
  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  if (await saveStripeCustomerId(userId, customer.id)) {
    return customer.id;
  }
  return (await getStripeCustomerId(userId)) ?? customer.id;
}

/**
 * 建立 Stripe Checkout Session（訂閱），回傳 { url } 讓用戶端導向。
 * proxy 不涵蓋 /api，這裡自行驗證登入（getCurrentUser 也會比對 sessionVersion 與帳號是否還在）
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return apiError("Unauthorized", 401);
  }
  const limit = await checkRateLimit("billing", user.id);
  if (!limit.success) {
    return apiError(rateLimitMessage(limit.reset), 429, {
      "Retry-After": String(retryAfterSeconds(limit.reset)),
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid plan", 400);
  }
  // 已訂閱的人改方案走 Customer Portal，不能再建立第二個訂閱
  if (user.isPro) {
    return apiError("You already have an active Pro subscription", 400);
  }
  const priceId = process.env[PRICE_ENV[parsed.data.plan]];
  if (!priceId) {
    console.error(`${PRICE_ENV[parsed.data.plan]} is not set`);
    return apiError("Checkout is not available", 500);
  }

  try {
    const customerId = await ensureCustomer(user.id, user.email);
    const appUrl = getAppUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // webhook（Phase 2）以它找回使用者
      metadata: { userId: user.id },
      success_url: `${appUrl}/settings?upgraded=true`,
      cancel_url: `${appUrl}/settings`,
    });
    if (!session.url) {
      return apiError("Failed to start checkout", 500);
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session", error);
    return apiError("Failed to start checkout", 500);
  }
}
