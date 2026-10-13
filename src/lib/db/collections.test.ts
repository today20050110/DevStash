import { beforeEach, describe, expect, it, vi } from "vitest";

import { collectionSchema } from "@/lib/collection-schemas";
import {
  createCollection,
  findOwnedCollectionIds,
  getCollectionsPage,
  getCollectionById,
  softDeleteCollection,
  updateCollection,
} from "@/lib/db/collections";
import { COLLECTIONS_PER_PAGE } from "@/lib/pagination";
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
  prisma: {
    $transaction: vi.fn(),
    collection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const transaction = vi.mocked(prisma.$transaction);
const findMany = vi.mocked(prisma.collection.findMany);

describe("getCollectionsPage", () => {
  const count = vi.mocked(prisma.collection.count);

  it("只取當頁、只取該使用者未刪除的，並彙總 item 數與型別組成", async () => {
    count.mockResolvedValue(30);
    findMany.mockResolvedValue([
      {
        id: "col-1",
        name: "DevOps",
        slug: "devops",
        description: null,
        isFavorite: false,
        items: [
          {
            item: {
              itemType: {
                id: "t-1",
                name: "Commands",
                slug: "commands",
                icon: "Terminal",
                color: "#f97316",
              },
            },
          },
          {
            item: {
              itemType: {
                id: "t-1",
                name: "Commands",
                slug: "commands",
                icon: "Terminal",
                color: "#f97316",
              },
            },
          },
        ],
      },
    ] as never);

    const page = await getCollectionsPage("user-1", 2);

    expect(count).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
    });
    const args = findMany.mock.calls[0][0];
    expect(args?.where).toEqual({ userId: "user-1", deletedAt: null });
    expect(args?.skip).toBe(COLLECTIONS_PER_PAGE);
    expect(args?.take).toBe(COLLECTIONS_PER_PAGE);
    expect(page).toMatchObject({ total: 30, page: 2, pageCount: 2 });
    expect(page.rows[0]).toMatchObject({
      id: "col-1",
      itemCount: 2,
      types: [{ id: "t-1", count: 2 }],
    });
  });
});

describe("getCollectionById", () => {
  const findFirst = vi.mocked(prisma.collection.findFirst);

  it("只查該使用者且未刪除的 collection", async () => {
    findFirst.mockResolvedValue({
      id: "col-1",
      name: "DevOps",
      description: null,
      isFavorite: false,
    } as never);

    await expect(getCollectionById("user-1", "col-1")).resolves.toMatchObject({
      id: "col-1",
    });
    expect(findFirst.mock.calls[0][0]?.where).toEqual({
      id: "col-1",
      userId: "user-1",
      deletedAt: null,
    });
  });

  it("查不到（別人的、不存在或已刪除）時回傳 null", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getCollectionById("user-1", "col-x")).resolves.toBeNull();
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
  const input = collectionSchema.parse({
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

describe("updateCollection", () => {
  const updateMany = vi.mocked(prisma.collection.updateMany);
  const data = collectionSchema.parse({
    name: "Renamed",
    description: "  ",
  });

  it("只更新該使用者且未刪除的 collection 的 name 與 description，slug 不變", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(updateCollection("user-1", "col-1", data)).resolves.toEqual({
      id: "col-1",
      name: "Renamed",
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1", deletedAt: null },
      data: { name: "Renamed", description: null },
    });
  });

  it("查不到（別人的、不存在或已刪除）時回傳 null", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(updateCollection("user-1", "col-x", data)).resolves.toBeNull();
  });
});

describe("softDeleteCollection", () => {
  const updateMany = vi.mocked(prisma.collection.updateMany);

  it("只對該使用者且尚未刪除的 collection 設定 deletedAt，不碰 item", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(softDeleteCollection("user-1", "col-1")).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "col-1", userId: "user-1", deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("查不到時回傳 false", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(softDeleteCollection("user-1", "col-x")).resolves.toBe(false);
  });
});
