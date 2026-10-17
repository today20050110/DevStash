import { beforeEach, describe, expect, it, vi } from "vitest";

import { isCheckoutSessionId, syncCheckoutSession } from "@/lib/billing-checkout";
import { saveBillingForUser } from "@/lib/db/billing";

const { retrieve } = vi.hoisted(() => ({ retrieve: vi.fn() }));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({ checkout: { sessions: { retrieve } } }),
}));
vi.mock("@/lib/db/billing", () => ({ saveBillingForUser: vi.fn() }));

const save = vi.mocked(saveBillingForUser);

const PERIOD_END = 1_790_000_000;
const SESSION_ID = "cs_test_a1B2c3";
const SUBSCRIPTION = {
  id: "sub_1",
  status: "active",
  items: { data: [{ current_period_end: PERIOD_END }] },
};

function session(overrides: object = {}) {
  return {
    id: SESSION_ID,
    status: "complete",
    metadata: { userId: "user-1" },
    customer: "cus_1",
    subscription: SUBSCRIPTION,
    ...overrides,
  } as never;
}

beforeEach(() => {
  retrieve.mockResolvedValue(session());
});

describe("isCheckoutSessionId", () => {
  it("只接受 Checkout Session 的 id 格式", () => {
    expect(isCheckoutSessionId("cs_test_a1B2c3")).toBe(true);
    expect(isCheckoutSessionId("cs_live_XyZ_9")).toBe(true);
    expect(isCheckoutSessionId("{CHECKOUT_SESSION_ID}")).toBe(false);
    expect(isCheckoutSessionId("sub_1")).toBe(false);
    expect(isCheckoutSessionId("cs_../../x")).toBe(false);
  });
});

describe("syncCheckoutSession", () => {
  it("已完成且屬於該使用者時，寫入最新的訂閱狀態與 customer 並回傳", async () => {
    const state = await syncCheckoutSession("user-1", SESSION_ID);

    expect(retrieve).toHaveBeenCalledWith(SESSION_ID, {
      expand: ["subscription"],
    });
    const expected = {
      isPro: true,
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: new Date(PERIOD_END * 1000),
      stripeSubscriptionId: "sub_1",
    };
    expect(state).toEqual(expected);
    expect(save).toHaveBeenCalledWith("user-1", {
      ...expected,
      stripeCustomerId: "cus_1",
    });
  });

  it("id 格式不符時不呼叫 Stripe", async () => {
    await expect(syncCheckoutSession("user-1", "not-a-session")).resolves.toBeNull();
    expect(retrieve).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("別人的 session 不寫入", async () => {
    retrieve.mockResolvedValue(session({ metadata: { userId: "user-2" } }));

    await expect(syncCheckoutSession("user-1", SESSION_ID)).resolves.toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("沒有 metadata.userId 的 session 不寫入", async () => {
    retrieve.mockResolvedValue(session({ metadata: {} }));

    await expect(syncCheckoutSession("user-1", SESSION_ID)).resolves.toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("尚未完成的 session 不寫入", async () => {
    retrieve.mockResolvedValue(session({ status: "open" }));

    await expect(syncCheckoutSession("user-1", SESSION_ID)).resolves.toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("沒有訂閱（或未 expand）時不寫入", async () => {
    retrieve.mockResolvedValue(session({ subscription: "sub_1" }));

    await expect(syncCheckoutSession("user-1", SESSION_ID)).resolves.toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it("Stripe 錯誤往外拋，由呼叫端決定如何處理", async () => {
    retrieve.mockRejectedValue(new Error("Stripe down"));

    await expect(syncCheckoutSession("user-1", SESSION_ID)).rejects.toThrow(
      "Stripe down",
    );
    expect(save).not.toHaveBeenCalled();
  });
});
