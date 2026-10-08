import { beforeEach, describe, expect, it, vi } from "vitest";

import { getItemDetail, updateItem } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/item-schemas";
import { prisma } from "@/lib/prisma";

// transaction 內的查詢另用一組 mock，與 transaction 外的 getItemDetail 分開檢查
const tx = {
  item: { findFirst: vi.fn(), update: vi.fn() },
  tag: { upsert: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: { item: { findFirst: vi.fn() }, $transaction: vi.fn() },
}));

const findFirst = vi.mocked(prisma.item.findFirst);
const transaction = vi.mocked(prisma.$transaction);

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

describe("updateItem", () => {
  const input = updateItemSchema.parse({
    title: "Renamed",
    description: "",
    content: "new content",
    language: "ts",
    url: "https://example.com",
    tags: ["React", "react", "auth"],
  });

  beforeEach(() => {
    transaction.mockImplementation(((
      callback: (client: typeof tx) => unknown,
    ) => callback(tx)) as never);
    tx.item.findFirst.mockResolvedValue({
      itemType: { kind: "TEXT", slug: "snippets" },
    });
    tx.tag.upsert.mockImplementation(
      async ({ create }: { create: { slug: string } }) => ({
        id: `tag-${create.slug}`,
      }),
    );
    findFirst.mockResolvedValue(ROW as never);
  });

  it("在 transaction 內以 userId 與 deletedAt 確認擁有者", async () => {
    await updateItem("user-1", "item-1", input);

    expect(tx.item.findFirst.mock.calls[0][0].where).toEqual({
      id: "item-1",
      userId: "user-1",
      deletedAt: null,
    });
  });

  it("查不到時不更新並回傳 null", async () => {
    tx.item.findFirst.mockResolvedValue(null);

    await expect(updateItem("user-1", "item-1", input)).resolves.toBeNull();
    expect(tx.item.update).not.toHaveBeenCalled();
    expect(tx.tag.upsert).not.toHaveBeenCalled();
  });

  it("標籤依 slug 去重後 upsert，並整批替換 item 的標籤", async () => {
    await updateItem("user-1", "item-1", input);

    expect(tx.tag.upsert).toHaveBeenCalledTimes(2);
    expect(tx.tag.upsert.mock.calls[0][0]).toMatchObject({
      where: { userId_slug: { userId: "user-1", slug: "react" } },
      create: { userId: "user-1", name: "React", slug: "react" },
    });
    expect(tx.item.update.mock.calls[0][0].data.tags).toEqual({
      deleteMany: {},
      create: [
        { tagId: "tag-react", source: "USER" },
        { tagId: "tag-auth", source: "USER" },
      ],
    });
  });

  it("只寫入該型別適用的欄位", async () => {
    await updateItem("user-1", "item-1", input);

    const { data } = tx.item.update.mock.calls[0][0];
    expect(data).toMatchObject({
      title: "Renamed",
      description: null,
      content: "new content",
      language: "ts",
    });
    expect(data).not.toHaveProperty("url");
  });

  it("link 只寫入 url，不寫 content 與 language", async () => {
    tx.item.findFirst.mockResolvedValue({
      itemType: { kind: "URL", slug: "links" },
    });

    await updateItem("user-1", "item-1", input);

    const { data } = tx.item.update.mock.calls[0][0];
    expect(data.url).toBe("https://example.com");
    expect(data).not.toHaveProperty("content");
    expect(data).not.toHaveProperty("language");
  });

  it("回傳更新後的完整資料", async () => {
    const item = await updateItem("user-1", "item-1", input);

    expect(item).toMatchObject({ id: "item-1", tags: ["auth", "react"] });
  });
});
