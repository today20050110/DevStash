import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSearchData } from "@/lib/db/search";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn(), collection: { findMany: vi.fn() } },
}));

const queryRaw = vi.mocked(prisma.$queryRaw);
const findMany = vi.mocked(prisma.collection.findMany);

describe("getSearchData", () => {
  beforeEach(() => {
    queryRaw.mockResolvedValue([
      {
        id: "item-1",
        title: "useAuth Hook",
        typeName: "Snippets",
        typeIcon: "Code",
        typeColor: "#3b82f6",
        preview: "export function\n  useAuth() {}",
      },
      {
        id: "item-2",
        title: "Empty note",
        typeName: "Notes",
        typeIcon: "StickyNote",
        typeColor: "#fde047",
        preview: null,
      },
    ]);
    findMany.mockResolvedValue([
      { id: "col-1", name: "React Patterns", _count: { items: 3 } },
    ] as never);
  });

  it("items 帶型別並把預覽壓成單行；collections 帶 item 數", async () => {
    await expect(getSearchData("user-1")).resolves.toEqual({
      items: [
        {
          id: "item-1",
          title: "useAuth Hook",
          type: { name: "Snippets", icon: "Code", color: "#3b82f6" },
          preview: "export function useAuth() {}",
        },
        {
          id: "item-2",
          title: "Empty note",
          type: { name: "Notes", icon: "StickyNote", color: "#fde047" },
          preview: null,
        },
      ],
      collections: [{ id: "col-1", name: "React Patterns", itemCount: 3 }],
    });
  });

  it("items 的 SQL 以 userId 篩選並排除已刪除的，content 只取開頭", async () => {
    await getSearchData("user-1");

    const [strings, ...values] = queryRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    const sql = strings.join("?");
    expect(sql).toContain(`WHERE i."userId" = ? AND i."deletedAt" IS NULL`);
    expect(sql).toContain(
      `left(COALESCE(i."content", i."url", i."fileName"), ?)`,
    );
    expect(values).toContain("user-1");
  });

  it("collections 只取該使用者未刪除的，item 數只算該使用者未刪除的 item", async () => {
    await getSearchData("user-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            items: { where: { item: { userId: "user-1", deletedAt: null } } },
          },
        },
      },
    });
  });
});
