import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  canceledBillingState,
  stripeId,
  subscriptionToBillingState,
} from "@/lib/billing";

const PERIOD_END = 1_790_000_000;

function subscription(status: string): Stripe.Subscription {
  // 只填 mapping 會讀的欄位
  return {
    id: "sub_1",
    status,
    items: { data: [{ current_period_end: PERIOD_END }] },
  } as unknown as Stripe.Subscription;
}

describe("subscriptionToBillingState", () => {
  it.each([
    ["active", "ACTIVE"],
    ["trialing", "TRIALING"],
    ["past_due", "PAST_DUE"],
  ])("%s 算 Pro（past_due 是扣款重試中，不降級）", (status, expected) => {
    expect(subscriptionToBillingState(subscription(status))).toEqual({
      isPro: true,
      plan: "PRO",
      subscriptionStatus: expected,
      currentPeriodEnd: new Date(PERIOD_END * 1000),
      stripeSubscriptionId: "sub_1",
    });
  });

  it.each([
    ["canceled", "CANCELED"],
    ["unpaid", "UNPAID"],
    ["incomplete", "INCOMPLETE"],
    ["incomplete_expired", "INCOMPLETE_EXPIRED"],
    ["paused", "PAUSED"],
  ])("%s 不是 Pro", (status, expected) => {
    expect(subscriptionToBillingState(subscription(status))).toMatchObject({
      isPro: false,
      plan: "FREE",
      subscriptionStatus: expected,
    });
  });

  it("未知的狀態不是 Pro，subscriptionStatus 為 null", () => {
    expect(subscriptionToBillingState(subscription("something_new"))).toMatchObject({
      isPro: false,
      subscriptionStatus: null,
    });
  });

  it("沒有 item 時 currentPeriodEnd 為 null", () => {
    const empty = {
      ...subscription("active"),
      items: { data: [] },
    } as unknown as Stripe.Subscription;
    expect(subscriptionToBillingState(empty).currentPeriodEnd).toBeNull();
  });
});

describe("canceledBillingState", () => {
  it("降級並清除 stripeSubscriptionId，保留最後的週期結束時間", () => {
    expect(canceledBillingState(subscription("canceled"))).toEqual({
      isPro: false,
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      currentPeriodEnd: new Date(PERIOD_END * 1000),
      stripeSubscriptionId: null,
    });
  });
});

describe("stripeId", () => {
  it("處理字串、已 expand 的物件與空值", () => {
    expect(stripeId("cus_1")).toBe("cus_1");
    expect(stripeId({ id: "cus_2" })).toBe("cus_2");
    expect(stripeId(null)).toBeNull();
    expect(stripeId(undefined)).toBeNull();
  });
});
