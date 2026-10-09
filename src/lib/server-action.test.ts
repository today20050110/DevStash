import { describe, expect, it, vi } from "vitest";

import { callServerAction } from "@/lib/server-action";

describe("callServerAction", () => {
  it("回傳 action 的結果，包含失敗的 result 物件", async () => {
    await expect(
      callServerAction(async () => ({
        success: false,
        error: "Item not found",
      })),
    ).resolves.toEqual({ success: false, error: "Item not found" });
  });

  it("promise reject（網路中斷、body 過大等）時回傳 null 而不是往外丟", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      callServerAction(() => Promise.reject(new TypeError("Failed to fetch"))),
    ).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
