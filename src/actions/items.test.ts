import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateItem } from "@/actions/items";
import { getCurrentUserId } from "@/lib/current-user";
import { updateItem as updateItemInDb } from "@/lib/db/items";
import type { ItemDetail } from "@/types/items";

// action 的測試只驗證流程（驗證、登入、錯誤對應），資料庫邏輯在 src/lib/db/items.test.ts
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/items", () => ({ updateItem: vi.fn() }));

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
    vi.mocked(updateItemInDb).mockResolvedValue(ITEM);
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
