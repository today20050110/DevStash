import { describe, expect, it } from "vitest";

import { nextAvailableSlug, toCollectionSlug } from "@/lib/collection-slug";

describe("toCollectionSlug", () => {
  it("轉小寫，空白與符號換成單一個 -，去掉頭尾的 -", () => {
    expect(toCollectionSlug("React Patterns")).toBe("react-patterns");
    expect(toCollectionSlug("  AI / Workflows!! ")).toBe("ai-workflows");
    expect(toCollectionSlug("C++ & Rust")).toBe("c-rust");
  });

  it("保留非英文的字母與數字", () => {
    expect(toCollectionSlug("前端 筆記 2026")).toBe("前端-筆記-2026");
  });

  it("沒有任何字母或數字時使用預設 slug", () => {
    expect(toCollectionSlug("!!!")).toBe("collection");
  });
});

describe("nextAvailableSlug", () => {
  it("沒被使用時直接回傳", () => {
    expect(nextAvailableSlug("devops", ["devops-tools"])).toBe("devops");
  });

  it("已被使用時加上第一個可用的數字後綴", () => {
    expect(nextAvailableSlug("devops", ["devops"])).toBe("devops-2");
    expect(nextAvailableSlug("devops", ["devops", "devops-2", "devops-3"])).toBe(
      "devops-4",
    );
  });

  it("中間有空號時補上空號", () => {
    expect(nextAvailableSlug("devops", ["devops", "devops-3"])).toBe("devops-2");
  });
});
