import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getItemDetail,
  getItemFile,
  getItemsByTypePage,
  getItemsInCollectionPage,
} from "@/lib/db/items";
import { ITEMS_PER_PAGE } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { item: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() } },
}));

const findFirst = vi.mocked(prisma.item.findFirst);

const ROW = {
  id: "item-1",
  title: "useAuth Hook",
  description: "Custom auth hook",
  content: "export function useAuth() {}",
  url: null,
  language: "typescript",
  isFavorite: true,
  pinnedAt: null,
  createdAt: new Date("2026-09-15T00:00:00Z"),
  updatedAt: new Date("2026-09-16T00:00:00Z"),
  storageKey: null,
  fileName: null,
  fileSize: null,
  mimeType: null,
  itemType: { name: "Snippets", icon: "Code", color: "#3b82f6", kind: "TEXT" },
  tags: [{ tag: { name: "auth" } }, { tag: { name: "react" } }],
  collections: [{ collection: { id: "col-1", name: "React Patterns" } }],
};

describe("getItemDetail", () => {
  beforeEach(() => {
    // 查詢的 select 形狀由 Prisma 推導，mock 的回傳值不需要完整對上型別
    findFirst.mockResolvedValue(ROW as never);
  });

  it("只查詢該使用者且未刪除的 item", async () => {
    await getItemDetail("user-1", "item-1");

    const args = findFirst.mock.calls[0][0];
    expect(args?.where).toEqual({
      id: "item-1",
      userId: "user-1",
      deletedAt: null,
    });
  });

  it("tags 與 collections 另外限制擁有者，collection 排除已刪除", async () => {
    await getItemDetail("user-1", "item-1");

    const select = findFirst.mock.calls[0][0]?.select;
    expect(select?.tags).toMatchObject({
      where: { tag: { userId: "user-1" } },
    });
    expect(select?.collections).toMatchObject({
      where: { collection: { userId: "user-1", deletedAt: null } },
    });
  });

  it("把關聯攤平成 drawer 用的形狀", async () => {
    const item = await getItemDetail("user-1", "item-1");

    expect(item).toMatchObject({
      id: "item-1",
      type: { name: "Snippets", kind: "TEXT" },
      tags: ["auth", "react"],
      collections: [{ id: "col-1", name: "React Patterns" }],
    });
    expect(item).not.toHaveProperty("itemType");
  });

  it("查不到（不存在、別人的或已刪除）時回傳 null", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getItemDetail("user-1", "item-2")).resolves.toBeNull();
  });

  it("沒有檔案時 file 為 null", async () => {
    const item = await getItemDetail("user-1", "item-1");

    expect(item?.file).toBeNull();
  });

  it("有檔案時回傳檔案資訊，但不把 storageKey 送到前端", async () => {
    findFirst.mockResolvedValue({
      ...ROW,
      storageKey: "users/user-1/items/key.png",
      fileName: "diagram.png",
      fileSize: 2048,
      mimeType: "image/png",
    } as never);

    const item = await getItemDetail("user-1", "item-1");

    expect(item?.file).toEqual({
      name: "diagram.png",
      size: 2048,
      mimeType: "image/png",
    });
    expect(item).not.toHaveProperty("storageKey");
    expect(item).not.toHaveProperty("fileName");
  });
});

describe("getItemFile", () => {
  it("只查該使用者、未刪除且有檔案的 item", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getItemFile("user-1", "item-1")).resolves.toBeNull();
    expect(findFirst.mock.calls[0][0]?.where).toEqual({
      id: "item-1",
      userId: "user-1",
      deletedAt: null,
      storageKey: { not: null },
    });
  });

  it("回傳 key 與資料庫記錄的中繼資料", async () => {
    findFirst.mockResolvedValue({
      storageKey: "users/user-1/items/key.pdf",
      fileName: "spec.pdf",
      fileSize: 10,
      mimeType: "application/pdf",
    } as never);

    await expect(getItemFile("user-1", "item-1")).resolves.toEqual({
      storageKey: "users/user-1/items/key.pdf",
      name: "spec.pdf",
      size: 10,
      mimeType: "application/pdf",
    });
  });
});

describe("getItemsInCollectionPage", () => {
  const findMany = vi.mocked(prisma.item.findMany);
  const count = vi.mocked(prisma.item.count);
  const owned = {
    collections: { some: { collectionId: "col-1" } },
    userId: "user-1",
    deletedAt: null,
  };

  it("計數與列表用同一組條件，只取當頁，由新到舊", async () => {
    count.mockResolvedValue(50);
    findMany.mockResolvedValue([]);

    const page = await getItemsInCollectionPage("user-1", "col-1", 2);

    expect(count).toHaveBeenCalledWith({ where: owned });
    const args = findMany.mock.calls[0][0];
    expect(args?.where).toEqual(owned);
    expect(args?.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(args?.skip).toBe(ITEMS_PER_PAGE);
    expect(args?.take).toBe(ITEMS_PER_PAGE);
    expect(page).toMatchObject({ total: 50, page: 2, pageCount: 3 });
  });

  it("沒有 item 時不查列表", async () => {
    count.mockResolvedValue(0);

    await expect(
      getItemsInCollectionPage("user-1", "col-1", 1),
    ).resolves.toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("getItemsByTypePage", () => {
  const summaryRow = (storageKey: string | null) => ({
    id: "item-1",
    title: "Quarterly report",
    description: null,
    isFavorite: false,
    pinnedAt: null,
    createdAt: new Date("2026-09-15T00:00:00Z"),
    storageKey,
    fileName: storageKey ? "report.pdf" : null,
    fileSize: storageKey ? 2048 : null,
    mimeType: storageKey ? "application/pdf" : null,
    itemType: { name: "Files", icon: "File", color: "#6b7280" },
    tags: [],
  });
  const findMany = vi.mocked(prisma.item.findMany);

  beforeEach(() => {
    vi.mocked(prisma.item.count).mockResolvedValue(1);
  });

  it("只查該使用者、未刪除且屬於該型別的 item", async () => {
    findMany.mockResolvedValue([]);
    await getItemsByTypePage("user-1", "type-1", 1);

    expect(findMany.mock.calls[0][0]?.where).toEqual({
      itemTypeId: "type-1",
      userId: "user-1",
      deletedAt: null,
    });
  });

  it("有檔案時回傳檔名、大小與 MIME，不把 storageKey 送到前端", async () => {
    findMany.mockResolvedValue([
      summaryRow("users/user-1/items/a.pdf"),
    ] as never);

    const {
      rows: [item],
    } = await getItemsByTypePage("user-1", "type-1", 1);
    expect(item.file).toEqual({
      name: "report.pdf",
      size: 2048,
      mimeType: "application/pdf",
    });
    expect(item).not.toHaveProperty("storageKey");
    expect(item).not.toHaveProperty("fileName");
  });

  it("沒有檔案的 item，file 為 null", async () => {
    findMany.mockResolvedValue([summaryRow(null)] as never);

    const {
      rows: [item],
    } = await getItemsByTypePage("user-1", "type-1", 1);
    expect(item.file).toBeNull();
  });

  it("另以一次查詢判斷哪些 item 有 content 或 url 可複製，限定同一批 id 與擁有者", async () => {
    findMany
      .mockResolvedValueOnce([
        { ...summaryRow(null), id: "with-content" },
        { ...summaryRow(null), id: "empty-note" },
      ] as never)
      .mockResolvedValueOnce([{ id: "with-content" }] as never);

    const { rows: items } = await getItemsByTypePage("user-1", "type-1", 1);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(findMany.mock.calls[1][0]).toEqual({
      where: {
        id: { in: ["with-content", "empty-note"] },
        userId: "user-1",
        OR: [
          { content: { not: null, notIn: [""] } },
          { url: { not: null, notIn: [""] } },
        ],
      },
      select: { id: true },
    });
    expect(items.map((item) => item.hasCopyValue)).toEqual([true, false]);
  });

  it("列表為空時不再查詢可複製的 item", async () => {
    findMany.mockResolvedValueOnce([]);

    await getItemsByTypePage("user-1", "type-1", 1);

    expect(findMany).toHaveBeenCalledTimes(1);
  });
});
