import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildOptimizeInput,
  OPTIMIZE_SUMMARY_MAX_LENGTH,
  optimizePrompt,
  parseOptimizedPrompt,
} from "@/lib/ai-optimize";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  getOpenAI: vi.fn(() => ({ responses: { create } })),
}));

const original = "Summarize this article.";

describe("buildOptimizeInput", () => {
  it("以 <prompt> 包住完整的 prompt，結尾要求 JSON", () => {
    const input = buildOptimizeInput({
      title: "Summarizer",
      content: "  Summarize {{text}}.  ",
    });
    expect(input).toContain("Title: Summarizer\n");
    expect(input).toContain("<prompt>\nSummarize {{text}}.\n</prompt>");
    expect(input).toMatch(/JSON\.$/);
  });

  it("沒有 title 時不列出", () => {
    expect(buildOptimizeInput({ title: " ", content: "x" })).not.toContain(
      "Title:",
    );
  });
});

describe("parseOptimizedPrompt", () => {
  it("回傳改寫後的 prompt 與說明，去掉多餘空白", () => {
    expect(
      parseOptimizedPrompt(
        JSON.stringify({
          improved: true,
          prompt: "  Summarize the article in 3 bullet points.\n",
          summary: "Added   an output\nformat.",
        }),
        original,
      ),
    ).toEqual({
      improved: true,
      prompt: "Summarize the article in 3 bullet points.",
      summary: "Added an output format.",
    });
  });

  it("模型說不需要修改時 improved 為 false、prompt 為空", () => {
    expect(
      parseOptimizedPrompt(
        '{"improved": false, "prompt": "", "summary": "Already clear."}',
        original,
      ),
    ).toEqual({ improved: false, prompt: "", summary: "Already clear." });
  });

  it("improved 為 true 但 prompt 與原文相同或空白時，視為不需要修改", () => {
    for (const prompt of [` ${original} `, "  "]) {
      expect(
        parseOptimizedPrompt(
          JSON.stringify({ improved: true, prompt, summary: "Tweaked." }),
          original,
        )?.improved,
      ).toBe(false);
    }
  });

  it("說明超過上限時截斷", () => {
    const result = parseOptimizedPrompt(
      JSON.stringify({
        improved: true,
        prompt: "New prompt",
        summary: "x".repeat(OPTIMIZE_SUMMARY_MAX_LENGTH + 50),
      }),
      original,
    );
    expect(result?.summary).toHaveLength(OPTIMIZE_SUMMARY_MAX_LENGTH);
  });

  it("格式不對時回傳 null", () => {
    expect(parseOptimizedPrompt("not json", original)).toBeNull();
    expect(parseOptimizedPrompt("[]", original)).toBeNull();
    expect(
      parseOptimizedPrompt('{"improved": "yes", "summary": ""}', original),
    ).toBeNull();
    expect(
      parseOptimizedPrompt('{"improved": true, "prompt": "x"}', original),
    ).toBeNull();
  });
});

describe("optimizePrompt", () => {
  beforeEach(() => {
    create.mockResolvedValue({
      status: "completed",
      output_text: JSON.stringify({
        improved: true,
        prompt: "Summarize the article in 3 bullet points.",
        summary: "Added an output format.",
      }),
      usage: { input_tokens: 400, output_tokens: 120 },
    });
  });

  it("用 Responses API 的 json_object 格式，不推理、不保存", async () => {
    await expect(
      optimizePrompt({ title: "", content: original }),
    ).resolves.toEqual({
      value: {
        improved: true,
        prompt: "Summarize the article in 3 bullet points.",
        summary: "Added an output format.",
      },
      usage: { inputTokens: 400, outputTokens: 120 },
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

  it("回應被截斷時丟錯，不回傳半截的 prompt", async () => {
    create.mockResolvedValue({ status: "incomplete", output_text: '{"impr' });
    await expect(
      optimizePrompt({ title: "", content: original }),
    ).rejects.toThrow("cut off");
  });

  it("回應無法解析時丟錯", async () => {
    create.mockResolvedValue({ status: "completed", output_text: "nope" });
    await expect(
      optimizePrompt({ title: "", content: original }),
    ).rejects.toThrow("Unparseable");
  });
});
