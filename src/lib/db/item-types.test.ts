import { describe, expect, it, vi } from "vitest";

import { findCreatableItemType } from "@/lib/db/item-types";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { itemType: { findFirst: vi.fn() } },
}));

describe("findCreatableItemType", () => {
  it("只查系統型別或自己的型別；FILE kind 由呼叫端依方案判斷", async () => {
    const itemTypeFindFirst = vi.mocked(prisma.itemType.findFirst);
    itemTypeFindFirst.mockResolvedValue(null);

    await findCreatableItemType("user-1", "type-1");

    expect(itemTypeFindFirst.mock.calls[0][0]?.where).toEqual({
      id: "type-1",
      OR: [{ isSystem: true, userId: null }, { userId: "user-1" }],
    });
  });
});
