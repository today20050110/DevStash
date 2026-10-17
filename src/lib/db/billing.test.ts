import { describe, expect, it, vi } from "vitest";

import { getStripeCustomerId, saveStripeCustomerId } from "@/lib/db/billing";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), updateMany: vi.fn() } },
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
