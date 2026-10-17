import { NextResponse } from "next/server";

import { apiError } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/current-user";
import { getStripeCustomerId } from "@/lib/db/billing";
import {
  checkRateLimit,
  rateLimitMessage,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/tokens";

/**
 * 建立 Stripe Customer Portal session（改方案、取消、更新付款方式、看發票），回傳 { url }。
 * customer 在第一次結帳時建立；還沒結帳過的使用者回 400
 */
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError("Unauthorized", 401);
  }
  const limit = await checkRateLimit("billing", userId);
  if (!limit.success) {
    return apiError(rateLimitMessage(limit.reset), 429, {
      "Retry-After": String(retryAfterSeconds(limit.reset)),
    });
  }

  const customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    return apiError("No billing account found", 400);
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppUrl()}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create billing portal session", error);
    return apiError("Failed to open billing portal", 500);
  }
}
