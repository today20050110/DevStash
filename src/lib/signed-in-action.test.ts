import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import { getCurrentUserId } from "@/lib/current-user";
import { withSignedInUser } from "@/lib/signed-in-action";

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));

describe("withSignedInUser", () => {
  beforeEach(() => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
  });

  it("以目前使用者的 id 執行並回傳結果", async () => {
    const run = vi.fn().mockResolvedValue({ success: true, data: 1 });
    await expect(withSignedInUser("label", run)).resolves.toEqual({
      success: true,
      data: 1,
    });
    expect(run).toHaveBeenCalledWith("user-1");
  });

  it("未登入時不執行，回登入提示", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    const run = vi.fn();
    await expect(withSignedInUser("label", run)).resolves.toEqual({
      success: false,
      error: NOT_SIGNED_IN_MESSAGE,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it("例外時記錄並回通用錯誤", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("db down");
    await expect(
      withSignedInUser("Failed to do thing", () => Promise.reject(failure)),
    ).resolves.toEqual({ success: false, error: GENERIC_ERROR_MESSAGE });
    expect(consoleError).toHaveBeenCalledWith("Failed to do thing", failure);
  });
});
