import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildDescriptionInput,
  DESCRIPTION_CONTENT_LIMIT,
  generateDescription,
  parseDescription,
} from "@/lib/ai-description";
import type { DescriptionInput } from "@/lib/ai-inputs";
import { DESCRIPTION_MAX_LENGTH } from "@/lib/item-schemas";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  getOpenAI: vi.fn(() => ({ responses: { create } })),
}));

const empty: DescriptionInput = {
  type: "snippets",
  title: "",
  content: "",
  language: "",
  url: "",
  fileName: "",
};

describe("buildDescriptionInput", () => {
  it("只列出有值的欄位", () => {
    const input = buildDescriptionInput({
      ...empty,
      type: "links",
      title: "React docs",
      url: "https://react.dev",
    });
    expect(input).toContain("Type: links");
    expect(input).toContain("Title: React docs");
    expect(input).toContain("URL: https://react.dev");
    expect(input).not.toContain("Language:");
    expect(input).not.toContain("Content:");
    expect(input).not.toContain("File name:");
  });

  it("files 帶檔名，snippets 帶語言", () => {
    expect(
      buildDescriptionInput({ ...empty, type: "files", fileName: "spec.pdf" }),
    ).toContain("File name: spec.pdf");
    expect(
      buildDescriptionInput({ ...empty, content: "x", language: "go" }),
    ).toContain("Language: go");
  });

  it("content 截斷到上限並註明", () => {
    const input = buildDescriptionInput({
      ...empty,
      content: "a".repeat(DESCRIPTION_CONTENT_LIMIT + 10),
    });
    expect(input).toContain("a".repeat(DESCRIPTION_CONTENT_LIMIT));
    expect(input).not.toContain("a".repeat(DESCRIPTION_CONTENT_LIMIT + 1));
    expect(input).toContain("(content truncated)");
  });

  it("含有 json_object 要求的 json 字樣", () => {
    expect(
      buildDescriptionInput({ ...empty, title: "t" }).toLowerCase(),
    ).toContain("json");
  });
});

describe("parseDescription", () => {
  it("取出描述並合併多餘的空白", () => {
    expect(
      parseDescription('{"description": "  A hook.\\n Debounces  values. "}'),
    ).toBe("A hook. Debounces values.");
  });

  it("超過欄位上限時截斷", () => {
    const long = "a".repeat(DESCRIPTION_MAX_LENGTH + 50);
    expect(
      parseDescription(JSON.stringify({ description: long })),
    ).toHaveLength(DESCRIPTION_MAX_LENGTH);
  });

  it("不是 JSON、沒有字串或是空白時回傳 null", () => {
    expect(parseDescription("A hook.")).toBeNull();
    expect(parseDescription('{"summary": "A hook."}')).toBeNull();
    expect(parseDescription('{"description": 42}')).toBeNull();
    expect(parseDescription('{"description": "   "}')).toBeNull();
    expect(parseDescription("null")).toBeNull();
  });
});

describe("generateDescription", () => {
  beforeEach(() => {
    create.mockResolvedValue({
      output_text: '{"description": "A hook."}',
      usage: { input_tokens: 200, output_tokens: 30 },
    });
  });

  it("用 Responses API 的 json_object 格式，不推理、不保存", async () => {
    await expect(
      generateDescription({ ...empty, title: "useDebounce" }),
    ).resolves.toEqual({
      value: "A hook.",
      usage: { inputTokens: 200, outputTokens: 30 },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.6-luna",
        reasoning: { effort: "none" },
        text: { format: { type: "json_object" } },
        store: false,
      }),
    );
  });

  it("回應無法解析時丟錯", async () => {
    create.mockResolvedValue({ output_text: "" });
    await expect(
      generateDescription({ ...empty, title: "t" }),
    ).rejects.toThrow("Unparseable");
  });
});
