import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCollectionSchema } from "@/lib/collection-schemas";
import {
  createCollection,
  findOwnedCollectionIds,
  getCollectionOptions,
} from "@/lib/db/collections";
import { prisma } from "@/lib/prisma";

const tx = {
  collection: {
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  $executeRaw: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: vi.fn(), collection: { findMany: vi.fn() } },
}));

const transaction = vi.mocked(prisma.$transaction);
const findMany = vi.mocked(prisma.collection.findMany);

describe("getCollectionOptions", () => {
  it("只取該使用者未刪除的 collections 的 id 與名稱，依名稱排序", async () => {
    findMany.mockResolvedValue([{ id: "col-1", name: "DevOps" }] as never);

    await expect(getCollectionOptions("user-1")).resolves.toEqual([
      { id: "col-1", name: "DevOps" },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
  });
});

describe("findOwnedCollectionIds", () => {
  it("只回傳屬於該使用者且未刪除的 id", async () => {
    findMany.mockResolvedValue([{ id: "col-1" }] as never);

    await expect(
      findOwnedCollectionIds("user-1", ["col-1", "col-other-user"]),
    ).resolves.toEqual(["col-1"]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["col-1", "col-other-user"] },
        userId: "user-1",
        deletedAt: null,
      },
      select: { id: true },
    });
  });

  it("沒有 id 時不查詢", async () => {
    await expect(findOwnedCollectionIds("user-1", [])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("createCollection", () => {
  const input = createCollectionSchema.parse({
    name: "React Patterns",
    description: "Hooks and components",
  });

  beforeEach(() => {
    transaction.mockImplementation(((
      callback: (client: typeof tx) => unknown,
    ) => callback(tx)) as never);
    tx.collection.count.mockResolvedValue(2);
    tx.collection.findMany.mockResolvedValue([]);
    tx.collection.create.mockResolvedValue({
      id: "col-9",
      name: "React Patterns",
    });
  });

  it("先取得該使用者的 advisory lock，再計數未刪除的 collection", async () => {
    await createCollection("user-1", input, 3);

    expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual(["user-1"]);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.collection.count.mock.invocationCallOrder[0],
    );
    expect(tx.collection.count).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
    });
  });

  it("以 userId 建立，slug 由名稱產生", async () => {
    const result = await createCollection("user-1", input, 3);

    expect(result).toEqual({
      status: "created",
      collection: { id: "col-9", name: "React Patterns" },
    });
    expect(tx.collection.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "React Patterns",
        slug: "react-patterns",
        description: "Hooks and components",
      },
      select: { id: true, name: true },
    });
  });

  it("同名時 slug 加上後綴；查詢包含已刪除的 collection", async () => {
    tx.collection.findMany.mockResolvedValue([
      { slug: "react-patterns" },
      { slug: "react-patterns-2" },
    ]);

    await createCollection("user-1", input, 3);

    expect(tx.collection.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", slug: { startsWith: "react-patterns" } },
      select: { slug: true },
    });
    expect(tx.collection.create.mock.calls[0][0].data.slug).toBe(
      "react-patterns-3",
    );
  });

  it("達到上限時不建立", async () => {
    tx.collection.count.mockResolvedValue(3);

    const result = await createCollection("user-1", input, 3);

    expect(result).toEqual({ status: "limit-reached", limit: 3 });
    expect(tx.collection.create).not.toHaveBeenCalled();
  });

  it("不限數量時不計數", async () => {
    await createCollection("user-1", input, null);

    expect(tx.collection.count).not.toHaveBeenCalled();
    expect(tx.collection.create).toHaveBeenCalled();
  });
});
