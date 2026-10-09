import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createItem,
  recordPendingDeletion,
  softDeleteItem,
  updateItem,
} from "@/lib/db/item-mutations";
import { createItemSchema, updateItemSchema } from "@/lib/item-schemas";
import { prisma } from "@/lib/prisma";

// transaction 內的查詢另用一組 mock，與 transaction 外的 getItemDetail 分開檢查
const tx = {
  item: {
    findFirst: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  tag: { upsert: vi.fn() },
  $executeRaw: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: { findFirst: vi.fn(), updateMany: vi.fn() },
    pendingDeletion: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// updateItem 回傳 getItemDetail 的結果，transaction 外的查詢用這組 mock
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
  storageKey: null,
  fileName: null,
  fileSize: null,
  mimeType: null,
  itemType: { name: "Snippets", icon: "Code", color: "#3b82f6", kind: "TEXT" },
  tags: [{ tag: { name: "auth" } }, { tag: { name: "react" } }],
  collections: [{ collection: { id: "col-1", name: "React Patterns" } }],
};

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

describe("softDeleteItem", () => {
  const updateMany = vi.mocked(prisma.item.updateMany);

  beforeEach(() => {
    findFirst.mockResolvedValue({ storageKey: null } as never);
  });

  it("只對該使用者且尚未刪除的 item 設定 deletedAt", async () => {
    updateMany.mockResolvedValue({ count: 1 });

    await expect(softDeleteItem("user-1", "item-1")).resolves.toEqual({
      storageKey: null,
    });
    expect(findFirst.mock.calls[0][0]?.where).toEqual({
      id: "item-1",
      userId: "user-1",
      deletedAt: null,
    });
    const args = updateMany.mock.calls[0][0];
    expect(args?.where).toEqual({
      id: "item-1",
      userId: "user-1",
      deletedAt: null,
    });
    expect(args?.data).toEqual({ deletedAt: expect.any(Date) });
  });

  it("回傳 storageKey 交給呼叫端刪除 R2 物件", async () => {
    findFirst.mockResolvedValue({
      storageKey: "users/user-1/items/key.png",
    } as never);
    updateMany.mockResolvedValue({ count: 1 });

    await expect(softDeleteItem("user-1", "item-1")).resolves.toEqual({
      storageKey: "users/user-1/items/key.png",
    });
  });

  it("查不到（別人的、不存在或已刪除）時不更新並回傳 null", async () => {
    findFirst.mockResolvedValue(null);

    await expect(softDeleteItem("user-1", "item-1")).resolves.toBeNull();
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("查詢後被同時刪除（updateMany 為 0 列）時回傳 null", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(softDeleteItem("user-1", "item-1")).resolves.toBeNull();
  });
});

describe("recordPendingDeletion", () => {
  it("記下 key 與錯誤訊息，留給 sweeper 重試", async () => {
    await recordPendingDeletion(
      "users/user-1/items/key.png",
      new Error("timeout"),
    );

    expect(prisma.pendingDeletion.create).toHaveBeenCalledWith({
      data: {
        storageKey: "users/user-1/items/key.png",
        attempts: 1,
        lastError: "timeout",
      },
    });
  });
});

describe("createItem", () => {
  const input = createItemSchema.omit({ itemTypeId: true }).parse({
    title: "useDebounce",
    content: "const x = 1;",
    language: "ts",
    url: "https://example.com",
    tags: ["React", "react"],
  });
  const snippets = {
    id: "type-snippets",
    kind: "TEXT",
    slug: "snippets",
  } as const;

  beforeEach(() => {
    transaction.mockImplementation(((
      callback: (client: typeof tx) => unknown,
    ) => callback(tx)) as never);
    tx.item.count.mockResolvedValue(49);
    tx.item.create.mockResolvedValue({ id: "item-9", title: "useDebounce" });
    tx.tag.upsert.mockImplementation(
      async ({ create }: { create: { slug: string } }) => ({
        id: `tag-${create.slug}`,
      }),
    );
  });

  it("先取得該使用者的 advisory lock，再計數未刪除的 item", async () => {
    await createItem("user-1", snippets, input, 50);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.calls[0].slice(1)).toEqual(["user-1"]);
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.item.count.mock.invocationCallOrder[0],
    );
    expect(tx.item.count).toHaveBeenCalledWith({
      where: { userId: "user-1", deletedAt: null },
    });
  });

  it("達到上限時不建立", async () => {
    tx.item.count.mockResolvedValue(50);

    await expect(createItem("user-1", snippets, input, 50)).resolves.toEqual({
      status: "limit-reached",
      limit: 50,
    });
    expect(tx.item.create).not.toHaveBeenCalled();
    expect(tx.tag.upsert).not.toHaveBeenCalled();
  });

  it("不限額度時不計數", async () => {
    await createItem("user-1", snippets, input, null);

    expect(tx.item.count).not.toHaveBeenCalled();
    expect(tx.item.create).toHaveBeenCalled();
  });

  it("以 userId 與型別建立，只寫入該型別適用的欄位並連上去重後的標籤", async () => {
    const result = await createItem("user-1", snippets, input, 50);

    expect(result).toEqual({
      status: "created",
      item: { id: "item-9", title: "useDebounce" },
    });
    const { data } = tx.item.create.mock.calls[0][0];
    expect(data).toMatchObject({
      userId: "user-1",
      itemTypeId: "type-snippets",
      title: "useDebounce",
      content: "const x = 1;",
      language: "ts",
      tags: { create: [{ tagId: "tag-react", source: "USER" }] },
    });
    expect(data).not.toHaveProperty("url");
  });
  it("FILE 型別寫入 action 確認過的檔案欄位", async () => {
    const images = { id: "type-images", kind: "FILE", slug: "images" } as const;
    const file = {
      storageKey: "users/user-1/items/key.png",
      fileName: "diagram.png",
      fileSize: 2048,
      mimeType: "image/png",
    };

    await createItem("user-1", images, input, 50, file);

    const { data } = tx.item.create.mock.calls[0][0];
    expect(data).toMatchObject(file);
    expect(data).not.toHaveProperty("content");
    expect(data).not.toHaveProperty("url");
  });

  it("lock 內發現 key 已被其他 item 使用時不建立（同一個上傳同時送出兩次）", async () => {
    const images = { id: "type-images", kind: "FILE", slug: "images" } as const;
    tx.item.findFirst.mockResolvedValue({ id: "item-other" });

    await expect(
      createItem("user-1", images, input, 50, {
        storageKey: "users/user-1/items/key.png",
        fileName: "a.png",
        fileSize: 1,
        mimeType: "image/png",
      }),
    ).resolves.toEqual({ status: "file-in-use" });
    expect(tx.item.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", storageKey: "users/user-1/items/key.png" },
      select: { id: true },
    });
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.item.findFirst.mock.invocationCallOrder[0],
    );
    expect(tx.item.create).not.toHaveBeenCalled();
  });

  it("非 FILE 型別忽略檔案欄位", async () => {
    await createItem("user-1", snippets, input, 50, {
      storageKey: "users/user-1/items/key.png",
      fileName: "x.png",
      fileSize: 1,
      mimeType: "image/png",
    });

    expect(tx.item.create.mock.calls[0][0].data).not.toHaveProperty(
      "storageKey",
    );
  });
});
