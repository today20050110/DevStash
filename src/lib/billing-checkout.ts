import type Stripe from "stripe";

import {
  stripeId,
  subscriptionToBillingState,
  type BillingState,
} from "@/lib/billing";
import { saveBillingForUser } from "@/lib/db/billing";
import { getStripe } from "@/lib/stripe";

/** Stripe Checkout Session 的 id 格式；不符合的就不呼叫 Stripe */
const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]+$/;

export function isCheckoutSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

/**
 * 從 Checkout 回到網站時主動同步訂閱，不必等 webhook（webhook 可能晚到或沒送達）。
 * session 必須屬於這個使用者（metadata.userId 由 checkout route 寫入）且已完成，
 * 否則不寫入、回傳 null。寫入規則與 webhook 相同（subscriptionToBillingState）
 */
export async function syncCheckoutSession(
  userId: string,
  sessionId: string,
): Promise<BillingState | null> {
  if (!isCheckoutSessionId(sessionId)) {
    return null;
  }
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });
  if (session.metadata?.userId !== userId || session.status !== "complete") {
    return null;
  }
  const subscription = session.subscription;
  if (!subscription || typeof subscription === "string") {
    return null;
  }

  const state = subscriptionToBillingState(subscription as Stripe.Subscription);
  const customerId = stripeId(session.customer);
  await saveBillingForUser(userId, {
    ...state,
    ...(customerId && { stripeCustomerId: customerId }),
  });
  return state;
}
