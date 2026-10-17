import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { apiError } from "@/lib/api-response";
import { handleStripeEvent } from "@/lib/billing-webhook";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook。驗簽需要原始 body，所以用 request.text()，不能先 JSON.parse。
 * 不需要登入（身分來自簽章），proxy 也不涵蓋 /api。
 * 處理失敗回 500，Stripe 會重送；事件紀錄與使用者更新在同一個 transaction，
 * 失敗時不會留下「已處理」的紀錄
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return apiError("Missing signature", 400);
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  // 金鑰也在這裡檢查：getStripe() 缺金鑰時丟出的錯誤若落進下面的 catch，會被誤報成簽章錯誤
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is not set");
    return apiError("Webhook is not configured", 500);
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch {
    return apiError("Invalid signature", 400);
  }

  try {
    const result = await handleStripeEvent(event);
    return NextResponse.json({
      received: true,
      duplicate: result === "duplicate",
    });
  } catch (error) {
    console.error("Failed to handle Stripe event", event.id, event.type, error);
    return apiError("Webhook handler failed", 500);
  }
}
