import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCollection,
  deleteCollection,
  setCollectionFavorite,
  updateCollection,
} from "@/actions/collections";
import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import { getCurrentUserId } from "@/lib/current-user";
import {
  createCollection as createCollectionInDb,
  setCollectionFavorite as setCollectionFavoriteInDb,
  softDeleteCollection,
  updateCollection as updateCollectionInDb,
} from "@/lib/db/collections";
import { getUserIsPro } from "@/lib/db/users";
import { checkRateLimit } from "@/lib/rate-limit";

// action 的測試只驗證流程（驗證、登入、錯誤對應），資料庫邏輯在 src/lib/db/ 的測試
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/collections", () => ({
  createCollection: vi.fn(),
  setCollectionFavorite: vi.fn(),
  softDeleteCollection: vi.fn(),
  updateCollection: vi.fn(),
}));
vi.mock("@/lib/db/users", () => ({ getUserIsPro: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(),
}));

const NEW_COLLECTION = { name: "  DevOps  ", description: "" };

describe("createCollection action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: true,
      remaining: 9,
      reset: 0,
    });
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    vi.mocked(createCollectionInDb).mockResolvedValue({
      status: "created",
      collection: { id: "col-1", name: "DevOps" },
    });
  });

  it("以 session 的 userId 與驗證後的資料建立，Free 方案帶入上限", async () => {
    const result = await createCollection(NEW_COLLECTION);

    expect(result).toEqual({
      success: true,
      data: { id: "col-1", name: "DevOps" },
    });
    expect(createCollectionInDb).toHaveBeenCalledWith(
      "user-1",
      { name: "DevOps", description: null },
      3,
    );
  });

  it("Pro 不限數量", async () => {
    vi.mocked(getUserIsPro).mockResolvedValue(true);

    await createCollection(NEW_COLLECTION);

    expect(vi.mocked(createCollectionInDb).mock.calls[0][2]).toBeNull();
  });

  it("用戶端傳入的 userId 被忽略", async () => {
    await createCollection({ ...NEW_COLLECTION, userId: "someone-else" });

    expect(vi.mocked(createCollectionInDb).mock.calls[0][0]).toBe("user-1");
    expect(vi.mocked(createCollectionInDb).mock.calls[0][1]).not.toHaveProperty(
      "userId",
    );
  });

  it("驗證失敗時回傳欄位錯誤，不碰資料庫", async () => {
    const result = await createCollection({ name: "   " });

    expect(result).toMatchObject({
      success: false,
      error: "Please fix the highlighted fields",
      fieldErrors: { name: "Name is required" },
    });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(createCollectionInDb).not.toHaveBeenCalled();
  });

  it("未登入時不建立", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await createCollection(NEW_COLLECTION);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signed in/);
    expect(createCollectionInDb).not.toHaveBeenCalled();
  });

  it("超過速率限制時不建立", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30_000,
    });

    const result = await createCollection(NEW_COLLECTION);

    expect(checkRateLimit).toHaveBeenCalledWith("createCollection", "user-1");
    expect(result.success).toBe(false);
    expect(createCollectionInDb).not.toHaveBeenCalled();
  });

  it("達到上限時回傳升級提示", async () => {
    vi.mocked(createCollectionInDb).mockResolvedValue({
      status: "limit-reached",
      limit: 3,
    });

    const result = await createCollection(NEW_COLLECTION);

    expect(result).toEqual({
      success: false,
      error:
        "The Free plan is limited to 3 collections. Delete a collection or upgrade to Pro to add more.",
    });
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createCollectionInDb).mockRejectedValue(new Error("db down"));

    const result = await createCollection(NEW_COLLECTION);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});

describe("updateCollection action", () => {
  const VALID = { name: "  Renamed  ", description: "Updated" };

  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(updateCollectionInDb).mockResolvedValue({
      id: "col-1",
      name: "Renamed",
    });
  });

  it("以 session 的 userId 與驗證後的資料更新", async () => {
    const result = await updateCollection("col-1", VALID);

    expect(result).toEqual({
      success: true,
      data: { id: "col-1", name: "Renamed" },
    });
    expect(updateCollectionInDb).toHaveBeenCalledWith("user-1", "col-1", {
      name: "Renamed",
      description: "Updated",
    });
  });

  it("驗證失敗時回傳欄位錯誤，不碰資料庫", async () => {
    const result = await updateCollection("col-1", { name: "" });

    expect(result.fieldErrors).toEqual({ name: "Name is required" });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(updateCollectionInDb).not.toHaveBeenCalled();
  });

  it("collection id 不是字串時當作找不到", async () => {
    const result = await updateCollection(42, VALID);

    expect(result).toEqual({ success: false, error: "Collection not found" });
    expect(updateCollectionInDb).not.toHaveBeenCalled();
  });

  it("未登入時不更新", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await updateCollection("col-1", VALID);

    expect(result.error).toMatch(/signed in/);
    expect(updateCollectionInDb).not.toHaveBeenCalled();
  });

  it("不屬於使用者、不存在或已刪除時回「Collection not found」", async () => {
    vi.mocked(updateCollectionInDb).mockResolvedValue(null);

    const result = await updateCollection("col-other-user", VALID);

    expect(result).toEqual({ success: false, error: "Collection not found" });
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateCollectionInDb).mockRejectedValue(new Error("db down"));

    const result = await updateCollection("col-1", VALID);

    expect(result).toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});

describe("deleteCollection action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(softDeleteCollection).mockResolvedValue(true);
  });

  it("以 session 的 userId 軟刪除", async () => {
    await expect(deleteCollection("col-1")).resolves.toEqual({
      success: true,
    });
    expect(softDeleteCollection).toHaveBeenCalledWith("user-1", "col-1");
  });

  it("collection id 不是字串時當作找不到", async () => {
    await expect(deleteCollection(undefined)).resolves.toEqual({
      success: false,
      error: "Collection not found",
    });
    expect(softDeleteCollection).not.toHaveBeenCalled();
  });

  it("未登入時不刪除", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await deleteCollection("col-1");

    expect(result.error).toMatch(/signed in/);
    expect(softDeleteCollection).not.toHaveBeenCalled();
  });

  it("不屬於使用者、不存在或已刪除時回「Collection not found」", async () => {
    vi.mocked(softDeleteCollection).mockResolvedValue(false);

    await expect(deleteCollection("col-other-user")).resolves.toEqual({
      success: false,
      error: "Collection not found",
    });
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(softDeleteCollection).mockRejectedValue(new Error("db down"));

    await expect(deleteCollection("col-1")).resolves.toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});

describe("setCollectionFavorite action", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(setCollectionFavoriteInDb).mockResolvedValue(true);
  });

  it.each([true, false])(
    "以目前使用者寫入目標值 %s 並回傳",
    async (isFavorite) => {
      await expect(setCollectionFavorite("col-1", isFavorite)).resolves.toEqual(
        { success: true, data: { isFavorite } },
      );
      expect(setCollectionFavoriteInDb).toHaveBeenCalledWith(
        "user-1",
        "col-1",
        isFavorite,
      );
    },
  );

  it("不屬於目前使用者、不存在或已刪除時回「Collection not found」", async () => {
    vi.mocked(setCollectionFavoriteInDb).mockResolvedValue(false);

    await expect(setCollectionFavorite("col-1", true)).resolves.toEqual({
      success: false,
      error: "Collection not found",
    });
  });

  it.each([
    ["空的 id", "", true],
    ["不是布林值的目標值", "col-1", "true"],
  ])("%s：不查 session 也不寫入", async (_, id, value) => {
    const result = await setCollectionFavorite(id, value);

    expect(result.success).toBe(false);
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(setCollectionFavoriteInDb).not.toHaveBeenCalled();
  });

  it("未登入時不寫入", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    await expect(setCollectionFavorite("col-1", true)).resolves.toEqual({
      success: false,
      error: NOT_SIGNED_IN_MESSAGE,
    });
    expect(setCollectionFavoriteInDb).not.toHaveBeenCalled();
  });

  it("資料庫錯誤時回傳通用訊息", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(setCollectionFavoriteInDb).mockRejectedValue(new Error("db"));

    await expect(setCollectionFavorite("col-1", true)).resolves.toEqual({
      success: false,
      error: GENERIC_ERROR_MESSAGE,
    });
  });
});
