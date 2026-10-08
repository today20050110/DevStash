import { beforeEach, describe, expect, it, vi } from "vitest";

import { getItemDetail } from "@/lib/db/items";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { item: { findFirst: vi.fn() } },
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
});
