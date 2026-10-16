import { beforeEach, describe, expect, it, vi } from "vitest";

import { listFavoriteCollections, listFavoriteItems } from "@/lib/db/favorites";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { item: { findMany: vi.fn() }, collection: { findMany: vi.fn() } },
}));

const findItems = vi.mocked(prisma.item.findMany);
const findCollections = vi.mocked(prisma.collection.findMany);

const SNIPPET = {
  id: "t-snippet",
  slug: "snippets",
  name: "Snippets",
  icon: "Code",
  color: "#3b82f6",
};
const LINK = {
  id: "t-link",
  slug: "links",
  name: "Links",
  icon: "Link",
  color: "#10b981",
};
const UPDATED = new Date("2026-10-01T00:00:00Z");

describe("listFavoriteItems", () => {
  beforeEach(() => {
    // 查詢的 select 形狀由 Prisma 推導，mock 的回傳值不需要完整對上型別
    findItems.mockResolvedValue([
      {
        id: "item-1",
        title: "useAuth Hook",
        updatedAt: UPDATED,
        itemType: { name: "Snippets", icon: "Code", color: "#3b82f6" },
      },
    ] as never);
  });

  it("只查詢該使用者、未刪除且已收藏的 items，依 updatedAt 由新到舊", async () => {
    await listFavoriteItems("user-1");

    const args = findItems.mock.calls[0][0];
    expect(args?.where).toEqual({
      isFavorite: true,
      userId: "user-1",
      deletedAt: null,
    });
    expect(args?.orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("型別改放在 type 欄位", async () => {
    expect(await listFavoriteItems("user-1")).toEqual([
      {
        id: "item-1",
        title: "useAuth Hook",
        updatedAt: UPDATED,
        type: { name: "Snippets", icon: "Code", color: "#3b82f6" },
      },
    ]);
  });
});

describe("listFavoriteCollections", () => {
  beforeEach(() => {
    findCollections.mockResolvedValue([
      {
        id: "col-1",
        name: "React Patterns",
        updatedAt: UPDATED,
        items: [
          { item: { itemType: LINK } },
          { item: { itemType: SNIPPET } },
          { item: { itemType: SNIPPET } },
        ],
      },
      { id: "col-2", name: "Empty", updatedAt: UPDATED, items: [] },
    ] as never);
  });

  it("只查詢該使用者、未刪除且已收藏的 collections，依 updatedAt 由新到舊", async () => {
    await listFavoriteCollections("user-1");

    const args = findCollections.mock.calls[0][0];
    expect(args?.where).toEqual({
      isFavorite: true,
      userId: "user-1",
      deletedAt: null,
    });
    expect(args?.orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
  });

  it("collection 內的 items 也限制擁有者並排除已刪除", async () => {
    await listFavoriteCollections("user-1");

    expect(findCollections.mock.calls[0][0]?.select?.items).toMatchObject({
      where: { item: { userId: "user-1", deletedAt: null } },
    });
  });

  it("附 item 數量與最多的型別；沒有 item 時型別為 null", async () => {
    expect(await listFavoriteCollections("user-1")).toEqual([
      {
        id: "col-1",
        name: "React Patterns",
        updatedAt: UPDATED,
        itemCount: 3,
        type: { name: "Snippets", icon: "Code", color: "#3b82f6" },
      },
      {
        id: "col-2",
        name: "Empty",
        updatedAt: UPDATED,
        itemCount: 0,
        type: null,
      },
    ]);
  });
});
