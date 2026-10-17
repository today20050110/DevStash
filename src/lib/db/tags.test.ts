import { describe, expect, it, vi } from "vitest";

import { getTagBySlug, getTagsWithCounts } from "@/lib/db/tags";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { tag: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

describe("getTagBySlug", () => {
  it("以使用者與 slug 的組合查詢，不會找到別人的標籤", async () => {
    const findUnique = vi.mocked(prisma.tag.findUnique);
    findUnique.mockResolvedValue(null);

    await expect(getTagBySlug("user-1", "react")).resolves.toBeNull();
    expect(findUnique.mock.calls[0][0]?.where).toEqual({
      userId_slug: { userId: "user-1", slug: "react" },
    });
  });
});

describe("getTagsWithCounts", () => {
  const findMany = vi.mocked(prisma.tag.findMany);

  it("只取該使用者、有未刪除 item 的標籤，計數也只算未刪除的 item", async () => {
    findMany.mockResolvedValue([]);

    await getTagsWithCounts("user-1");

    const args = findMany.mock.calls[0][0];
    const activeItems = { item: { userId: "user-1", deletedAt: null } };
    expect(args?.where).toEqual({
      userId: "user-1",
      items: { some: activeItems },
    });
    expect(args?.select?._count).toEqual({
      select: { items: { where: activeItems } },
    });
  });

  it("依數量、再依名稱排序", async () => {
    // select 形狀由 Prisma 推導，mock 的回傳值不需要完整對上型別
    findMany.mockResolvedValue([
      { name: "hooks", slug: "hooks", _count: { items: 2 } },
      { name: "auth", slug: "auth", _count: { items: 2 } },
      { name: "react", slug: "react", _count: { items: 5 } },
    ] as never);

    await expect(getTagsWithCounts("user-1")).resolves.toEqual([
      { name: "react", slug: "react", itemCount: 5 },
      { name: "auth", slug: "auth", itemCount: 2 },
      { name: "hooks", slug: "hooks", itemCount: 2 },
    ]);
  });
});
