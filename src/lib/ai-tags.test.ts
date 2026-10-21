import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AUTO_TAG_CONTENT_LIMIT,
  buildAutoTagInput,
  generateTagSuggestions,
  parseTagSuggestions,
} from "@/lib/ai-tags";
import { getOpenAI } from "@/lib/openai";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/openai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/openai")>()),
  getOpenAI: vi.fn(() => ({ responses: { create } })),
}));

describe("parseTagSuggestions", () => {
  it("接受 {tags: [...]} 物件", () => {
    expect(parseTagSuggestions('{"tags": ["react", "hooks"]}')).toEqual([
      "react",
      "hooks",
    ]);
  });

  it("也接受直接回傳的陣列", () => {
    expect(parseTagSuggestions('["git", "cli"]')).toEqual(["git", "cli"]);
  });

  it("轉小寫、去空白，並去掉重複", () => {
    expect(
      parseTagSuggestions('{"tags": [" React ", "react", "TypeScript"]}'),
    ).toEqual(["react", "typescript"]);
  });

  it("略過非字串、空字串與過長的標籤，最多 5 個", () => {
    const long = "x".repeat(51);
    expect(
      parseTagSuggestions(
        JSON.stringify({ tags: [1, "", long, "a", "b", "c", "d", "e", "f"] }),
      ),
    ).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("不是 JSON 或沒有陣列時回傳 null", () => {
    expect(parseTagSuggestions("react, hooks")).toBeNull();
    expect(parseTagSuggestions('{"labels": ["react"]}')).toBeNull();
    expect(parseTagSuggestions("null")).toBeNull();
  });
});

describe("buildAutoTagInput", () => {
  it("content 截斷到上限並註明", () => {
    const input = buildAutoTagInput({
      title: "Title",
      content: "a".repeat(AUTO_TAG_CONTENT_LIMIT + 100),
    });
    expect(input).toContain("a".repeat(AUTO_TAG_CONTENT_LIMIT));
    expect(input).not.toContain("a".repeat(AUTO_TAG_CONTENT_LIMIT + 1));
    expect(input).toContain("(content truncated)");
  });

  it("沒超過上限時不註明截斷，且含有 json_object 要求的 json 字樣", () => {
    const input = buildAutoTagInput({ title: "Title", content: "short" });
    expect(input).not.toContain("truncated");
    expect(input.toLowerCase()).toContain("json");
  });
});

describe("generateTagSuggestions", () => {
  beforeEach(() => {
    create.mockResolvedValue({
      output_text: '{"tags": ["React"]}',
      usage: { input_tokens: 120, output_tokens: 15 },
    });
  });

  it("用 Responses API 的 json_object 格式，不推理、不保存，並回傳 token 數", async () => {
    await expect(
      generateTagSuggestions({ title: "t", content: "c" }),
    ).resolves.toEqual({
      value: ["react"],
      usage: { inputTokens: 120, outputTokens: 15 },
    });
    expect(getOpenAI).toHaveBeenCalled();
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
      generateTagSuggestions({ title: "t", content: "c" }),
    ).rejects.toThrow("Unparseable");
  });
});
