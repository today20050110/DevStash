import { describe, expect, it, vi } from "vitest";

import {
  getPageCount,
  getPageList,
  loadPage,
  pageHref,
  parsePageParam,
} from "@/lib/pagination";

describe("parsePageParam", () => {
  it("正整數照用", () => {
    expect(parsePageParam("3")).toBe(3);
  });

  it.each([
    undefined,
    "",
    "abc",
    "0",
    "-2",
    "1.5",
    "2abc",
    "99999999999999999999",
  ])("%s 視為第 1 頁", (value) => {
    expect(parsePageParam(value)).toBe(1);
  });

  it("重複的參數只取第一個", () => {
    expect(parsePageParam(["4", "2"])).toBe(4);
  });
});

describe("getPageCount", () => {
  it("無條件進位，沒有資料時仍為 1 頁", () => {
    expect(getPageCount(0, 21)).toBe(1);
    expect(getPageCount(21, 21)).toBe(1);
    expect(getPageCount(22, 21)).toBe(2);
  });
});

describe("loadPage", () => {
  it("依頁碼算出 skip 與 take", async () => {
    const fetchRows = vi.fn(async () => ["row"]);

    const page = await loadPage(2, 21, async () => 50, fetchRows);

    expect(fetchRows).toHaveBeenCalledWith(21, 21);
    expect(page).toEqual({ rows: ["row"], total: 50, page: 2, pageCount: 3 });
  });

  it("超過最後一頁時改取最後一頁", async () => {
    const fetchRows = vi.fn(async () => []);

    const page = await loadPage(9, 21, async () => 50, fetchRows);

    expect(fetchRows).toHaveBeenCalledWith(42, 21);
    expect(page.page).toBe(3);
  });

  it("沒有資料時不查列表", async () => {
    const fetchRows = vi.fn(async () => []);

    await expect(loadPage(1, 21, async () => 0, fetchRows)).resolves.toEqual({
      rows: [],
      total: 0,
      page: 1,
      pageCount: 1,
    });
    expect(fetchRows).not.toHaveBeenCalled();
  });
});

describe("getPageList", () => {
  it("頁數少時全部列出", () => {
    expect(getPageList(1, 1)).toEqual([1]);
    expect(getPageList(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it("中間頁：第一頁、前後各一頁、最後一頁，其餘省略", () => {
    expect(getPageList(5, 20)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      20,
    ]);
  });

  it("靠近兩端時只在另一側省略", () => {
    expect(getPageList(1, 20)).toEqual([1, 2, "ellipsis", 20]);
    expect(getPageList(20, 20)).toEqual([1, "ellipsis", 19, 20]);
  });

  it("只差一頁時直接顯示那一頁，不用省略號", () => {
    expect(getPageList(4, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
    expect(getPageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("pageHref", () => {
  it("第 1 頁不帶參數，其他頁帶 ?page", () => {
    expect(pageHref("/collections", 1)).toBe("/collections");
    expect(pageHref("/collections", 3)).toBe("/collections?page=3");
  });
});
