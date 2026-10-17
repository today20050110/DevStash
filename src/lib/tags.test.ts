import { describe, expect, it } from "vitest";

import {
  applyTagSuggestion,
  currentTagSegment,
  dedupeTagNames,
  parseTagInput,
  slugFromParam,
  suggestTags,
  tagHref,
  toTagSlug,
} from "@/lib/tags";

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

describe("tagHref", () => {
  it("以 slug 組成網址", () => {
    expect(tagHref("React Hooks")).toBe("/tags/react-hooks");
  });

  it("編碼 slug 中的特殊字元", () => {
    expect(tagHref("C++")).toBe("/tags/c%2B%2B");
    expect(tagHref("next.js")).toBe("/tags/next.js");
    expect(tagHref("100%")).toBe("/tags/100%25");
  });
});

describe("slugFromParam", () => {
  it("解碼還帶著 %xx 的參數", () => {
    expect(slugFromParam("c%2B%2B")).toBe("c++");
  });

  it("已解碼且含 % 時原樣回傳", () => {
    expect(slugFromParam("100%")).toBe("100%");
  });
});

describe("currentTagSegment", () => {
  it("取最後一個逗號之後的片段並去掉空白", () => {
    expect(currentTagSegment("react, ho")).toBe("ho");
    expect(currentTagSegment("  typ")).toBe("typ");
  });

  it("結尾是逗號或空字串時為空", () => {
    expect(currentTagSegment("react, ")).toBe("");
    expect(currentTagSegment("")).toBe("");
  });
});

describe("suggestTags", () => {
  const options = [
    { name: "react", itemCount: 5 },
    { name: "React Native", itemCount: 1 },
    { name: "preact", itemCount: 2 },
    { name: "hooks", itemCount: 3 },
  ];

  it("不分大小寫的子字串比對，依使用次數排序", () => {
    expect(suggestTags("REA", options).map((o) => o.name)).toEqual([
      "react",
      "preact",
      "React Native",
    ]);
  });

  it("排除欄位中已輸入的標籤（以 slug 比較）", () => {
    expect(suggestTags("React, rea", options).map((o) => o.name)).toEqual([
      "preact",
      "React Native",
    ]);
  });

  it("片段是空的時不建議", () => {
    expect(suggestTags("react, ", options)).toEqual([]);
  });

  it("最多回傳 limit 個，次數相同時依名稱排序", () => {
    const many = ["b", "a", "c"].map((name) => ({
      name: `tag-${name}`,
      itemCount: 1,
    }));
    expect(suggestTags("tag", many, 2).map((o) => o.name)).toEqual([
      "tag-a",
      "tag-b",
    ]);
  });
});

describe("applyTagSuggestion", () => {
  it("取代目前片段並接上「, 」", () => {
    expect(applyTagSuggestion("ho", "hooks")).toBe("hooks, ");
    expect(applyTagSuggestion("react, ho", "hooks")).toBe("react, hooks, ");
    expect(applyTagSuggestion("react,ho", "hooks")).toBe("react, hooks, ");
  });
});
