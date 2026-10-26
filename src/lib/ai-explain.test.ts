import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildExplainInput,
  EXPLAIN_CONTENT_LIMIT,
  explainCode,
} from "@/lib/ai-explain";
import type { ExplainCodeInput } from "@/lib/ai-inputs";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  getOpenAI: vi.fn(() => ({ responses: { create } })),
}));

const snippet: ExplainCodeInput = {
  type: "snippets",
  title: "useDebounce",
  language: "typescript",
  content: "export function useDebounce() {}",
};

describe("buildExplainInput", () => {
  it("以 <item> 包住型別、title、語言與 content", () => {
    const input = buildExplainInput(snippet);
    expect(input).toMatch(/^<item>\n/);
    expect(input).toMatch(/\n<\/item>$/);
    expect(input).toContain("Type: code snippet");
    expect(input).toContain("Title: useDebounce");
    expect(input).toContain("Language: typescript");
    expect(input).toContain("Content:\nexport function useDebounce() {}");
  });

  it("command 標成終端機指令，空的欄位不列出", () => {
    const input = buildExplainInput({
      type: "commands",
      title: " ",
      language: "",
      content: "git reset --hard",
    });
    expect(input).toContain("Type: terminal command");
    expect(input).not.toContain("Title:");
    expect(input).not.toContain("Language:");
  });

  it("content 超過上限時截斷並註明", () => {
    const input = buildExplainInput({
      ...snippet,
      content: "x".repeat(EXPLAIN_CONTENT_LIMIT + 10),
    });
    expect(input).toContain(
      `${"x".repeat(EXPLAIN_CONTENT_LIMIT)}\n(content truncated)`,
    );
    expect(input).not.toContain("x".repeat(EXPLAIN_CONTENT_LIMIT + 1));
  });
});

describe("explainCode", () => {
  beforeEach(() => {
    create.mockResolvedValue({
      output_text: "  Debounces a value.\n",
      usage: { input_tokens: 300, output_tokens: 250 },
    });
  });

  it("用 Responses API 產生純文字的 Markdown，不推理、不保存", async () => {
    await expect(explainCode(snippet)).resolves.toEqual({
      value: "Debounces a value.",
      usage: { inputTokens: 300, outputTokens: 250 },
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-5.6-luna",
        reasoning: { effort: "none" },
        store: false,
      }),
    );
    expect(create.mock.calls[0][0]).not.toHaveProperty("text");
  });

  it("空白的回應丟錯", async () => {
    create.mockResolvedValue({ output_text: "  " });
    await expect(explainCode(snippet)).rejects.toThrow("Empty explanation");
  });
});
