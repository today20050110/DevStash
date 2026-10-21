import { describe, expect, it } from "vitest";

import { hasDescribableContent } from "@/lib/ai-inputs";

const empty = {
  type: "snippets",
  title: "",
  content: "",
  language: "",
  url: "",
  fileName: "",
};

describe("hasDescribableContent", () => {
  it.each(["title", "content", "url", "fileName"] as const)(
    "%s 有值就可以產生描述",
    (field) => {
      expect(hasDescribableContent({ ...empty, [field]: "x" })).toBe(true);
    },
  );

  it("只有型別與語言、或只有空白時不行", () => {
    expect(hasDescribableContent({ ...empty, language: "go" })).toBe(false);
    expect(hasDescribableContent({ ...empty, title: "   " })).toBe(false);
  });
});
