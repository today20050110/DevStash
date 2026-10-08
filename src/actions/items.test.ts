import { beforeEach, describe, expect, it, vi } from "vitest";

import { createItem, deleteItem, updateItem } from "@/actions/items";
import { getCurrentUserId } from "@/lib/current-user";
import {
  createItem as createItemInDb,
  findCreatableItemType,
  softDeleteItem,
  updateItem as updateItemInDb,
} from "@/lib/db/items";
import { getUserIsPro } from "@/lib/db/users";
import { FREE_CONTENT_LIMIT_BYTES } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";
import type { CreatableItemType, ItemDetail } from "@/types/items";

// action 的測試只驗證流程（驗證、登入、錯誤對應），資料庫邏輯在 src/lib/db/items.test.ts
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/items", () => ({
  createItem: vi.fn(),
  findCreatableItemType: vi.fn(),
  softDeleteItem: vi.fn(),
  updateItem: vi.fn(),
}));
vi.mock("@/lib/db/users", () => ({ getUserIsPro: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

const SNIPPETS = {
  id: "type-snippets",
  name: "Snippets",
  slug: "snippets",
  icon: "Code",
  color: "#3b82f6",
  kind: "TEXT",
} satisfies CreatableItemType;

const LINKS = {
  ...SNIPPETS,
  id: "type-links",
  name: "Links",
  slug: "links",
  kind: "URL",
} satisfies CreatableItemType;

const NEW_ITEM = {
  itemTypeId: "type-snippets",
  title: "  useDebounce  ",
  description: "",
  content: "const x = 1;\n",
  language: "ts",
  url: "",
  tags: ["react"],
};

describe("createItem action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 29,
      reset: 0,
    });
    vi.mocked(findCreatableItemType).mockResolvedValue(SNIPPETS);
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    vi.mocked(createItemInDb).mockResolvedValue({
      status: "created",
      item: { id: "item-9", title: "useDebounce" },
    });
  });

  it("以正規化的資料建立，Free 方案帶入 50 筆上限", async () => {
    const result = await createItem(NEW_ITEM);

    expect(result).toEqual({
      success: true,
      data: { id: "item-9", title: "useDebounce" },
    });
    expect(findCreatableItemType).toHaveBeenCalledWith(
      "user-1",
      "type-snippets",
    );
    expect(createItemInDb).toHaveBeenCalledWith(
      "user-1",
      SNIPPETS,
      {
        title: "useDebounce",
        description: null,
        content: "const x = 1;\n",
        language: "ts",
        url: null,
        tags: ["react"],
      },
      50,
    );
  });

  it("Pro 方案不限項目數", async () => {
    vi.mocked(getUserIsPro).mockResolvedValue(true);

    await createItem(NEW_ITEM);

    expect(vi.mocked(createItemInDb).mock.calls[0][3]).toBeNull();
  });

  it("驗證失敗時回傳欄位錯誤，不查詢登入狀態也不碰資料庫", async () => {
    const result = await createItem({ ...NEW_ITEM, itemTypeId: "", title: "" });

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toEqual({
      itemTypeId: "Choose a type",
      title: "Title is required",
    });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(createItemInDb).not.toHaveBeenCalled();
  });

  it("未登入時不建立，也不計入速率限制", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await createItem(NEW_ITEM);

    expect(result.error).toMatch(/no longer signed in/);
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(createItemInDb).not.toHaveBeenCalled();
  });

  it("超過速率限制時不建立，以 userId 為鍵", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const result = await createItem(NEW_ITEM);

    expect(checkRateLimit).toHaveBeenCalledWith("createItem", "user-1");
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again in 1 minute.",
    });
    expect(createItemInDb).not.toHaveBeenCalled();
  });

  it("型別不可新增（別人的、FILE kind 或不存在）時回傳型別欄位錯誤", async () => {
    vi.mocked(findCreatableItemType).mockResolvedValue(null);

    const result = await createItem(NEW_ITEM);

    expect(result.fieldErrors).toEqual({ itemTypeId: "Choose a valid type" });
    expect(createItemInDb).not.toHaveBeenCalled();
  });

  it("URL 型別沒有填 url 時回傳 URL 必填", async () => {
    vi.mocked(findCreatableItemType).mockResolvedValue(LINKS);

    const result = await createItem({ ...NEW_ITEM, itemTypeId: LINKS.id });

    expect(result.fieldErrors).toEqual({ url: "URL is required" });
    expect(createItemInDb).not.toHaveBeenCalled();
  });

  it("content 超過 Free 方案上限時不建立；Pro 可以", async () => {
    const content = "a".repeat(FREE_CONTENT_LIMIT_BYTES + 1);

    const free = await createItem({ ...NEW_ITEM, content });
    expect(free.fieldErrors).toEqual({
      content: "Content must be 100 KB or less",
    });
    expect(createItemInDb).not.toHaveBeenCalled();

    vi.mocked(getUserIsPro).mockResolvedValue(true);
    await expect(createItem({ ...NEW_ITEM, content })).resolves.toMatchObject({
      success: true,
    });
  });

  it("URL 型別不檢查 content（不會寫入）", async () => {
    vi.mocked(findCreatableItemType).mockResolvedValue(LINKS);

    const result = await createItem({
      ...NEW_ITEM,
      itemTypeId: LINKS.id,
      url: "https://example.com",
      content: "a".repeat(FREE_CONTENT_LIMIT_BYTES + 1),
    });

    expect(result.success).toBe(true);
  });

  it("達到額度時回傳升級提示", async () => {
    vi.mocked(createItemInDb).mockResolvedValue({
      status: "limit-reached",
      limit: 50,
    });

    const result = await createItem(NEW_ITEM);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/limited to 50 items/);
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.mocked(createItemInDb).mockRejectedValue(new Error("connection lost"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(createItem(NEW_ITEM)).resolves.toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});

const VALID = {
  title: "  Renamed  ",
  description: "",
  content: "x",
  language: "",
  url: "",
  tags: ["react"],
};

const ITEM = { id: "item-1", title: "Renamed" } as ItemDetail;

describe("updateItem action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    vi.mocked(updateItemInDb).mockResolvedValue(ITEM);
  });

  it("content 超過方案上限時不更新，避免以編輯繞過新增時的檢查", async () => {
    const result = await updateItem("item-1", {
      ...VALID,
      content: "a".repeat(FREE_CONTENT_LIMIT_BYTES + 1),
    });

    expect(result.fieldErrors).toEqual({
      content: "Content must be 100 KB or less",
    });
    expect(updateItemInDb).not.toHaveBeenCalled();
  });

  it("驗證通過後以正規化的資料更新並回傳 item", async () => {
    const result = await updateItem("item-1", VALID);

    expect(result).toEqual({ success: true, data: ITEM });
    expect(updateItemInDb).toHaveBeenCalledWith("user-1", "item-1", {
      title: "Renamed",
      description: null,
      content: "x",
      language: null,
      url: null,
      tags: ["react"],
    });
  });

  it("驗證失敗時回傳欄位錯誤，不查詢登入狀態也不碰資料庫", async () => {
    const result = await updateItem("item-1", {
      ...VALID,
      title: " ",
      url: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.fieldErrors).toEqual({
      title: "Title is required",
      url: "URL must start with http:// or https://",
    });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(updateItemInDb).not.toHaveBeenCalled();
  });

  it("item id 不是字串時當作找不到", async () => {
    const result = await updateItem(42, VALID);

    expect(result).toEqual({ success: false, error: "Item not found" });
    expect(updateItemInDb).not.toHaveBeenCalled();
  });

  it("未登入時不更新", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await updateItem("item-1", VALID);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no longer signed in/);
    expect(updateItemInDb).not.toHaveBeenCalled();
  });

  it("不屬於目前使用者或不存在時回傳 Item not found", async () => {
    vi.mocked(updateItemInDb).mockResolvedValue(null);

    const result = await updateItem("item-1", VALID);

    expect(result).toEqual({ success: false, error: "Item not found" });
  });

  it("資料庫錯誤時回傳通用訊息，不外洩例外內容", async () => {
    vi.mocked(updateItemInDb).mockRejectedValue(new Error("connection lost"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await updateItem("item-1", VALID);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});

describe("deleteItem action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(softDeleteItem).mockResolvedValue(true);
  });

  it("以目前使用者軟刪除 item", async () => {
    await expect(deleteItem("item-1")).resolves.toEqual({ success: true });
    expect(softDeleteItem).toHaveBeenCalledWith("user-1", "item-1");
  });

  it.each([42, "", null])("item id 不合法（%s）時當作找不到", async (id) => {
    await expect(deleteItem(id)).resolves.toEqual({
      success: false,
      error: "Item not found",
    });
    expect(softDeleteItem).not.toHaveBeenCalled();
  });

  it("未登入時不刪除", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await deleteItem("item-1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no longer signed in/);
    expect(softDeleteItem).not.toHaveBeenCalled();
  });

  it("不屬於目前使用者、不存在或已刪除時回傳 Item not found", async () => {
    vi.mocked(softDeleteItem).mockResolvedValue(false);

    await expect(deleteItem("item-1")).resolves.toEqual({
      success: false,
      error: "Item not found",
    });
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.mocked(softDeleteItem).mockRejectedValue(new Error("connection lost"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(deleteItem("item-1")).resolves.toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});
