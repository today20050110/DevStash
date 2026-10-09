import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchItemDetail, itemApiUrl, itemFileUrl } from "@/lib/item-api";

// vitest.config 只還原 env，stubGlobal 的 fetch 要自己還原
afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("item URLs", () => {
  it("id 經過編碼，不能改寫成其他路徑", () => {
    expect(itemApiUrl("a/b?c")).toBe("/api/items/a%2Fb%3Fc");
    expect(itemFileUrl("item-1")).toBe("/api/items/item-1/file");
  });
});

describe("fetchItemDetail", () => {
  it("把 JSON 的日期字串轉回 Date", async () => {
    const fetchMock = stubFetch(200, {
      success: true,
      data: {
        id: "item-1",
        pinnedAt: null,
        createdAt: "2026-09-15T00:00:00.000Z",
        updatedAt: "2026-09-16T00:00:00.000Z",
      },
    });

    const item = await fetchItemDetail("item-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/items/item-1", {
      signal: undefined,
    });
    expect(item.createdAt).toEqual(new Date("2026-09-15T00:00:00.000Z"));
    expect(item.pinnedAt).toBeNull();
  });

  it("API 回錯誤時丟出它的訊息", async () => {
    stubFetch(404, { success: false, error: "Item not found" });

    await expect(fetchItemDetail("x")).rejects.toThrow("Item not found");
  });

  it("success 為 false 但狀態 200 時也視為失敗", async () => {
    stubFetch(200, { success: false });

    await expect(fetchItemDetail("x")).rejects.toThrow("Failed to load item");
  });

  it("非 JSON 的錯誤頁顯示通用訊息，不外露 SyntaxError", async () => {
    stubFetch(502, "<html>Bad Gateway</html>");

    await expect(fetchItemDetail("x")).rejects.toThrow("Failed to load item");
  });
});
