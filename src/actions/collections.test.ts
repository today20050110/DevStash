import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCollection } from "@/actions/collections";
import { getCurrentUserId } from "@/lib/current-user";
import { createCollection as createCollectionInDb } from "@/lib/db/collections";
import { getUserIsPro } from "@/lib/db/users";
import { checkRateLimit } from "@/lib/rate-limit";

// action 的測試只驗證流程（驗證、登入、錯誤對應），資料庫邏輯在 src/lib/db/ 的測試
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/collections", () => ({ createCollection: vi.fn() }));
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
