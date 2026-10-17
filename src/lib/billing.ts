import type Stripe from "stripe";

import type { Plan, SubscriptionStatus } from "@/generated/prisma/enums";

const STATUS: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  paused: "PAUSED",
};

/**
 * 算 Pro 的狀態。past_due（扣款失敗、Stripe 重試中）也算：重試期間不降級，
 * 全部重試失敗後 Stripe 會把狀態改成 canceled 或 unpaid，那時才降級
 */
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

/** webhook 寫入 User 的帳務欄位；isPro 是判斷依據，其餘記錄 Stripe 的實際狀態 */
export interface BillingState {
  isPro: boolean;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  stripeSubscriptionId: string | null;
}

/**
 * 週期結束時間在 subscription item 上（API 2025-03-31.basil 起不在 subscription 本身）；
 * DevStash 每個訂閱只有一個 price，取第一個 item
 */
function periodEnd(subscription: Stripe.Subscription): Date | null {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

export function subscriptionToBillingState(
  subscription: Stripe.Subscription,
): BillingState {
  const isPro = PRO_STATUSES.has(subscription.status);
  return {
    isPro,
    plan: isPro ? "PRO" : "FREE",
    subscriptionStatus: STATUS[subscription.status] ?? null,
    currentPeriodEnd: periodEnd(subscription),
    stripeSubscriptionId: subscription.id,
  };
}

/** 訂閱已刪除：降級並清除 stripeSubscriptionId，保留最後的週期結束時間 */
export function canceledBillingState(
  subscription: Stripe.Subscription,
): BillingState {
  return {
    isPro: false,
    plan: "FREE",
    subscriptionStatus: "CANCELED",
    currentPeriodEnd: periodEnd(subscription),
    stripeSubscriptionId: null,
  };
}

/** Stripe 的關聯欄位可能是 id 字串、已 expand 的物件，或 null */
export function stripeId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}
