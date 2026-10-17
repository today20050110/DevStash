import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  canCreateCollection,
  canCreateItem,
  getUserUsage,
  MAX_COLLECTIONS,
  MAX_ITEMS,
} from "@/lib/usage";

vi.mock("@/lib/prisma", () => ({
  prisma: { item: { count: vi.fn() }, collection: { count: vi.fn() } },
}));

const itemCount = vi.mocked(prisma.item.count);
const collectionCount = vi.mocked(prisma.collection.count);

describe("limits", () => {
  it("Free 方案是 50 個 item、3 個 collection", () => {
    expect(MAX_ITEMS).toBe(50);
    expect(MAX_COLLECTIONS).toBe(3);
  });
});

describe("getUserUsage", () => {
  it("回傳正確的數量與 canCreate，且只計算該使用者未刪除的資料", async () => {
    itemCount.mockResolvedValue(12);
    collectionCount.mockResolvedValue(2);

    await expect(getUserUsage("user-1", false)).resolves.toEqual({
      itemCount: 12,
      collectionCount: 2,
      canCreateItem: true,
      canCreateCollection: true,
    });
    const owned = { where: { userId: "user-1", deletedAt: null } };
    expect(itemCount).toHaveBeenCalledWith(owned);
    expect(collectionCount).toHaveBeenCalledWith(owned);
  });

  it("剛好 50 個 item 時 canCreateItem 為 false", async () => {
    itemCount.mockResolvedValue(50);
    collectionCount.mockResolvedValue(0);

    const usage = await getUserUsage("user-1", false);
    expect(usage.canCreateItem).toBe(false);
    expect(usage.canCreateCollection).toBe(true);
  });

  it("剛好 3 個 collection 時 canCreateCollection 為 false", async () => {
    itemCount.mockResolvedValue(0);
    collectionCount.mockResolvedValue(3);

    const usage = await getUserUsage("user-1", false);
    expect(usage.canCreateCollection).toBe(false);
    expect(usage.canCreateItem).toBe(true);
  });

  it("Pro 超過上限仍可新增，數量照實回傳", async () => {
    itemCount.mockResolvedValue(120);
    collectionCount.mockResolvedValue(10);

    await expect(getUserUsage("user-1", true)).resolves.toEqual({
      itemCount: 120,
      collectionCount: 10,
      canCreateItem: true,
      canCreateCollection: true,
    });
  });
});

describe("canCreateItem", () => {
  it("低於上限時為 true", async () => {
    itemCount.mockResolvedValue(49);
    await expect(canCreateItem("user-1", false)).resolves.toBe(true);
  });

  it("達到上限（50）時為 false", async () => {
    itemCount.mockResolvedValue(50);
    await expect(canCreateItem("user-1", false)).resolves.toBe(false);
  });

  it("Pro 不受上限限制，且不查資料庫", async () => {
    itemCount.mockResolvedValue(500);
    await expect(canCreateItem("user-1", true)).resolves.toBe(true);
    expect(itemCount).not.toHaveBeenCalled();
  });
});

describe("canCreateCollection", () => {
  it("低於上限時為 true", async () => {
    collectionCount.mockResolvedValue(2);
    await expect(canCreateCollection("user-1", false)).resolves.toBe(true);
  });

  it("達到上限（3）時為 false", async () => {
    collectionCount.mockResolvedValue(3);
    await expect(canCreateCollection("user-1", false)).resolves.toBe(false);
  });

  it("Pro 不受上限限制，且不查資料庫", async () => {
    collectionCount.mockResolvedValue(50);
    await expect(canCreateCollection("user-1", true)).resolves.toBe(true);
    expect(collectionCount).not.toHaveBeenCalled();
  });
});
