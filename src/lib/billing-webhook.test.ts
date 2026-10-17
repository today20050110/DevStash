import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleStripeEvent } from "@/lib/billing-webhook";
import { applyStripeEvent } from "@/lib/db/billing";
import { stripe } from "@/lib/stripe";

vi.mock("@/lib/stripe", () => ({
  stripe: { subscriptions: { retrieve: vi.fn() } },
}));
vi.mock("@/lib/db/billing", () => ({ applyStripeEvent: vi.fn() }));

const retrieve = vi.mocked(stripe.subscriptions.retrieve);
const apply = vi.mocked(applyStripeEvent);

const PERIOD_END = 1_790_000_000;
const LATEST = {
  id: "sub_1",
  status: "active",
  customer: "cus_1",
  items: { data: [{ current_period_end: PERIOD_END }] },
};

function event(type: string, object: object): Stripe.Event {
  return { id: "evt_1", type, data: { object } } as unknown as Stripe.Event;
}

beforeEach(() => {
  retrieve.mockResolvedValue(LATEST as never);
  apply.mockResolvedValue("applied");
});

describe("handleStripeEvent", () => {
  it("checkout.session.completed：以 metadata.userId 更新，存 customer 與最新的訂閱狀態", async () => {
    await handleStripeEvent(
      event("checkout.session.completed", {
        metadata: { userId: "user-1" },
        customer: "cus_1",
        subscription: "sub_1",
      }),
    );

    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ id: "evt_1" }), {
      target: { userId: "user-1" },
      data: {
        isPro: true,
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        currentPeriodEnd: new Date(PERIOD_END * 1000),
        stripeSubscriptionId: "sub_1",
        stripeCustomerId: "cus_1",
      },
    });
  });

  it("checkout.session.completed 沒有 userId 或訂閱時只記錄事件", async () => {
    await handleStripeEvent(
      event("checkout.session.completed", { metadata: {}, subscription: "sub_1" }),
    );

    expect(retrieve).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledWith(expect.anything(), null);
  });

  it("customer.subscription.updated：向 Stripe 取最新狀態，而不是採用事件內容", async () => {
    retrieve.mockResolvedValue({ ...LATEST, status: "past_due" } as never);

    await handleStripeEvent(
      event("customer.subscription.updated", { id: "sub_1", status: "active" }),
    );

    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(apply).toHaveBeenCalledWith(expect.anything(), {
      target: { customerId: "cus_1", subscriptionId: "sub_1", matchUnset: true },
      data: expect.objectContaining({ isPro: true, subscriptionStatus: "PAST_DUE" }),
    });
  });

  it("invoice.paid：從 invoice.parent 取訂閱 id 並同步", async () => {
    await handleStripeEvent(
      event("invoice.paid", {
        parent: { subscription_details: { subscription: "sub_1" } },
      }),
    );

    expect(retrieve).toHaveBeenCalledWith("sub_1");
    expect(apply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: expect.objectContaining({ isPro: true }) }),
    );
  });

  it("invoice.payment_failed：只記錄 warning，不更新使用者", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await handleStripeEvent(event("invoice.payment_failed", { id: "in_1" }));

    expect(warn).toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledWith(expect.anything(), null);
  });

  it("customer.subscription.deleted：只降級目前就是這個訂閱的使用者，並清除訂閱 id", async () => {
    await handleStripeEvent(
      event("customer.subscription.deleted", { ...LATEST, status: "canceled" }),
    );

    expect(retrieve).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledWith(expect.anything(), {
      target: { customerId: "cus_1", subscriptionId: "sub_1", matchUnset: false },
      data: expect.objectContaining({
        isPro: false,
        plan: "FREE",
        subscriptionStatus: "CANCELED",
        stripeSubscriptionId: null,
      }),
    });
  });

  it("其他事件只記錄", async () => {
    await handleStripeEvent(event("customer.created", { id: "cus_1" }));

    expect(apply).toHaveBeenCalledWith(expect.anything(), null);
  });

  it("重複的事件回傳 duplicate", async () => {
    apply.mockResolvedValue("duplicate");

    await expect(
      handleStripeEvent(event("customer.created", { id: "cus_1" })),
    ).resolves.toBe("duplicate");
  });

  it("向 Stripe 取訂閱失敗時往外拋，讓 webhook 回 500 由 Stripe 重送", async () => {
    retrieve.mockRejectedValue(new Error("Stripe down"));

    await expect(
      handleStripeEvent(event("customer.subscription.updated", { id: "sub_1" })),
    ).rejects.toThrow("Stripe down");
    expect(apply).not.toHaveBeenCalled();
  });
});
