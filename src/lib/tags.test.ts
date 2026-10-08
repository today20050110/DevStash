import { describe, expect, it } from "vitest";

import { dedupeTagNames, parseTagInput, toTagSlug } from "@/lib/tags";

describe("toTagSlug", () => {
  it("trim、轉小寫、空白換成 -", () => {
    expect(toTagSlug("  React   Hooks ")).toBe("react-hooks");
  });
});

describe("parseTagInput", () => {
  it("以逗號分隔並去掉空白與空項目", () => {
    expect(parseTagInput(" react, hooks ,, auth ,")).toEqual([
      "react",
      "hooks",
      "auth",
    ]);
  });

  it("空字串回傳空陣列", () => {
    expect(parseTagInput("   ")).toEqual([]);
  });
});

describe("dedupeTagNames", () => {
  it("slug 相同的只留第一次出現的名稱", () => {
    expect(dedupeTagNames(["React Hooks", "react hooks", "auth"])).toEqual([
      "React Hooks",
      "auth",
    ]);
  });
});
