import { describe, expect, it } from "vitest";

import { SEARCH_PREVIEW_LENGTH, toSearchPreview } from "@/lib/search";

describe("toSearchPreview", () => {
  it("換行、縮排等連續空白壓成一個空格，去掉頭尾空白", () => {
    expect(toSearchPreview("  export function\n\tuseAuth() {\n}\n")).toBe(
      "export function useAuth() { }",
    );
  });

  it("沒有內容或只有空白時為 null", () => {
    expect(toSearchPreview(null)).toBeNull();
    expect(toSearchPreview(" \n\t ")).toBeNull();
  });

  it("剛好在上限內時不截斷", () => {
    const text = "a".repeat(SEARCH_PREVIEW_LENGTH);
    expect(toSearchPreview(text)).toBe(text);
  });

  it("超過上限時截斷並以 … 結尾，不留結尾空白", () => {
    expect(toSearchPreview("abcd efgh", 5)).toBe("abcd…");
    expect(toSearchPreview("a".repeat(SEARCH_PREVIEW_LENGTH + 1))).toBe(
      `${"a".repeat(SEARCH_PREVIEW_LENGTH)}…`,
    );
  });
});
