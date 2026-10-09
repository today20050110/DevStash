import { describe, expect, it } from "vitest";

import { apiError } from "@/lib/api-response";

describe("apiError", () => {
  it("回傳 { success: false, error } 與指定的狀態碼", async () => {
    const response = apiError("Item not found", 404);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Item not found",
    });
  });

  it("帶入額外的 header（例如 Retry-After）", () => {
    const response = apiError("Too many requests", 429, {
      "Retry-After": "60",
    });

    expect(response.headers.get("Retry-After")).toBe("60");
  });
});
