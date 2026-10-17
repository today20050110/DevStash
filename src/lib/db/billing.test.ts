import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import {
  applyStripeEvent,
  getStripeCustomerId,
  saveStripeCustomerId,
} from "@/lib/db/billing";
import { prisma } from "@/lib/prisma";

const tx = {
  stripeEvent: { create: vi.fn() },
  user: { updateMany: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("getStripeCustomerId", () => {
  it("只讀該使用者的 stripeCustomerId，查無使用者時回傳 null", async () => {
    const findUnique = vi.mocked(prisma.user.findUnique);
    findUnique.mockResolvedValue(null);

    await expect(getStripeCustomerId("user-1")).resolves.toBeNull();
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { stripeCustomerId: true },
    });
  });
});

describe("saveStripeCustomerId", () => {
  const updateMany = vi.mocked(prisma.user.updateMany);

  it("只在還沒有 customer 時寫入", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(saveStripeCustomerId("user-1", "cus_1")).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", stripeCustomerId: null },
      data: { stripeCustomerId: "cus_1" },
    });
  });

  it("別的請求先寫入時回傳 false", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(saveStripeCustomerId("user-1", "cus_2")).resolves.toBe(false);
  });
});

describe("applyStripeEvent", () => {
  const event = { id: "evt_1", type: "customer.subscription.updated" };
  const transaction = vi.mocked(prisma.$transaction);

  beforeEach(() => {
    // 以假的 tx 執行 transaction 的 callback
    transaction.mockImplementation(((callback: (client: typeof tx) => unknown) =>
      callback(tx)) as never);
  });

  it("在同一個 transaction 內記錄事件並更新使用者（依 userId）", async () => {
    await expect(
      applyStripeEvent(event, { target: { userId: "user-1" }, data: { isPro: true } }),
    ).resolves.toBe("applied");

    expect(tx.stripeEvent.create).toHaveBeenCalledWith({
      data: { id: "evt_1", type: "customer.subscription.updated" },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isPro: true },
    });
  });

  it("matchUnset 時，訂閱 id 相同或還沒有訂閱 id 的使用者都會更新", async () => {
    await applyStripeEvent(event, {
      target: { customerId: "cus_1", subscriptionId: "sub_1", matchUnset: true },
      data: { isPro: true },
    });

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: {
        stripeCustomerId: "cus_1",
        OR: [{ stripeSubscriptionId: "sub_1" }, { stripeSubscriptionId: null }],
      },
      data: { isPro: true },
    });
  });

  it("不 matchUnset 時只更新目前就是這個訂閱的使用者", async () => {
    await applyStripeEvent(event, {
      target: { customerId: "cus_1", subscriptionId: "sub_1", matchUnset: false },
      data: { isPro: false },
    });

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1" },
      data: { isPro: false },
    });
  });

  it("沒有要寫入的內容時只記錄事件", async () => {
    await applyStripeEvent(event, null);

    expect(tx.stripeEvent.create).toHaveBeenCalled();
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it("事件 id 重複（P2002）時回傳 duplicate", async () => {
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );

    await expect(applyStripeEvent(event, null)).resolves.toBe("duplicate");
  });

  it("其他錯誤往外拋，讓 Stripe 重送", async () => {
    transaction.mockRejectedValue(new Error("connection lost"));

    await expect(applyStripeEvent(event, null)).rejects.toThrow("connection lost");
  });
});
