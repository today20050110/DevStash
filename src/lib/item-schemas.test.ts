import { describe, expect, it } from "vitest";

import { updateItemSchema } from "@/lib/item-schemas";

const VALID = {
  title: "useAuth Hook",
  description: "Custom auth hook",
  content: "export {}\n",
  language: "typescript",
  url: "",
  tags: ["react"],
};

describe("updateItemSchema", () => {
  it("trim 標題，空字串轉為 null，content 保留原樣", () => {
    const result = updateItemSchema.parse({
      ...VALID,
      title: "  useAuth Hook  ",
      description: "   ",
      content: "  indented\n",
    });
    expect(result).toMatchObject({
      title: "useAuth Hook",
      description: null,
      content: "  indented\n",
      url: null,
    });
  });

  it("標題只有空白時失敗", () => {
    const result = updateItemSchema.safeParse({ ...VALID, title: "   " });
    expect(result.success).toBe(false);
  });

  it.each(["javascript:alert(1)", "ftp://example.com/x", "not a url"])(
    "拒絕非 http(s) 的 URL：%s",
    (url) => {
      expect(updateItemSchema.safeParse({ ...VALID, url }).success).toBe(false);
    },
  );

  it("接受 https URL 並 trim", () => {
    const result = updateItemSchema.parse({
      ...VALID,
      url: " https://nextjs.org/docs ",
    });
    expect(result.url).toBe("https://nextjs.org/docs");
  });

  it("標籤 trim 後不能是空字串", () => {
    expect(
      updateItemSchema.safeParse({ ...VALID, tags: ["react", "  "] }).success,
    ).toBe(false);
  });

  it("沒有傳 tags 時預設為空陣列，選填欄位可省略", () => {
    expect(updateItemSchema.parse({ title: "x" })).toEqual({
      title: "x",
      description: null,
      content: null,
      language: null,
      url: null,
      tags: [],
    });
  });

  it("不是物件時失敗", () => {
    expect(updateItemSchema.safeParse("x").success).toBe(false);
  });
});
