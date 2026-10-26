import OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  explainCode,
  generateAutoTags,
  generateDescription,
} from "@/actions/ai";
import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import {
  DESCRIPTION_EMPTY_MESSAGE,
  DESCRIPTION_FAILED_MESSAGE,
  generateDescription as generateDescriptionText,
} from "@/lib/ai-description";
import {
  EXPLAIN_EMPTY_MESSAGE,
  EXPLAIN_FAILED_MESSAGE,
  explainCode as explainCodeText,
} from "@/lib/ai-explain";
import {
  AUTO_TAG_EMPTY_MESSAGE,
  AUTO_TAG_FAILED_MESSAGE,
  generateTagSuggestions,
} from "@/lib/ai-tags";
import { getCurrentUserId } from "@/lib/current-user";
import {
  completeAiUsage,
  releaseAiUsage,
  reserveAiUsage,
} from "@/lib/db/ai-usage";
import { getUserIsPro } from "@/lib/db/users";
import { AI_BUSY_MESSAGE } from "@/lib/openai";
import { AI_DAILY_LIMIT, AI_PRO_MESSAGE } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";

// action 的測試只驗證流程（驗證、登入、Pro、速率限制、每日上限、用量紀錄、錯誤對應）；
// 解析與截斷在 src/lib/ai-tags.test.ts 與 ai-description.test.ts，資料庫邏輯在 src/lib/db/ai-usage.test.ts
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/users", () => ({ getUserIsPro: vi.fn() }));
vi.mock("@/lib/db/ai-usage", () => ({
  reserveAiUsage: vi.fn(),
  completeAiUsage: vi.fn(),
  releaseAiUsage: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitMessage: () => "Too many attempts",
}));
vi.mock("@/lib/ai-description", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai-description")>()),
  generateDescription: vi.fn(),
}));
vi.mock("@/lib/ai-explain", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai-explain")>()),
  explainCode: vi.fn(),
}));
vi.mock("@/lib/ai-tags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai-tags")>()),
  generateTagSuggestions: vi.fn(),
}));

const input = { title: "useDebounce hook", content: "export function useDebounce() {}" };

beforeEach(() => {
  vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
  vi.mocked(getUserIsPro).mockResolvedValue(true);
  vi.mocked(checkRateLimit).mockResolvedValue({
    success: true,
    remaining: 19,
    reset: 0,
  });
  vi.mocked(reserveAiUsage).mockResolvedValue({
    status: "reserved",
    id: "usage-1",
  });
  vi.mocked(completeAiUsage).mockResolvedValue();
  vi.mocked(releaseAiUsage).mockResolvedValue();
  vi.mocked(generateTagSuggestions).mockResolvedValue({
    value: ["react", "hooks"],
    usage: { inputTokens: 120, outputTokens: 15 },
  });
  vi.mocked(generateDescriptionText).mockResolvedValue({
    value: "A debounce hook.",
    usage: { inputTokens: 200, outputTokens: 30 },
  });
  vi.mocked(explainCodeText).mockResolvedValue({
    value: "Debounces a value.",
    usage: { inputTokens: 300, outputTokens: 250 },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("每日上限與用量紀錄", () => {
  it("成功時以 feature 佔額度，並把 token 數寫回同一筆", async () => {
    await generateAutoTags(input);
    expect(reserveAiUsage).toHaveBeenCalledWith(
      "user-1",
      "AUTO_TAG",
      AI_DAILY_LIMIT,
    );
    expect(completeAiUsage).toHaveBeenCalledWith("user-1", "usage-1", {
      inputTokens: 120,
      outputTokens: 15,
    });
    expect(releaseAiUsage).not.toHaveBeenCalled();
  });

  it("描述記為 SUMMARIZE", async () => {
    await generateDescription({ type: "notes", title: "Meeting notes" });
    expect(reserveAiUsage).toHaveBeenCalledWith(
      "user-1",
      "SUMMARIZE",
      AI_DAILY_LIMIT,
    );
  });

  it("達到每日上限時不呼叫 AI，訊息告知多久後可再用", async () => {
    vi.mocked(reserveAiUsage).mockResolvedValue({
      status: "limit-reached",
      resetAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    });
    const result = await generateAutoTags(input);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/about 3 hours/);
    expect(generateTagSuggestions).not.toHaveBeenCalled();
  });

  it("AI 失敗時釋放佔住的額度", async () => {
    vi.mocked(generateTagSuggestions).mockRejectedValue(new Error("boom"));
    await generateAutoTags(input);
    expect(releaseAiUsage).toHaveBeenCalledWith("user-1", "usage-1");
    expect(completeAiUsage).not.toHaveBeenCalled();
  });

  it("釋放失敗也照樣回傳 AI 的錯誤訊息", async () => {
    vi.mocked(generateTagSuggestions).mockRejectedValue(new Error("boom"));
    vi.mocked(releaseAiUsage).mockRejectedValue(new Error("db down"));
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: false,
      error: AUTO_TAG_FAILED_MESSAGE,
    });
  });

  it("被速率限制擋下時不佔每日額度", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    await generateAutoTags(input);
    expect(reserveAiUsage).not.toHaveBeenCalled();
  });
});

describe("generateAutoTags", () => {
  it("Pro 使用者取得建議，速率限制以 userId 計算", async () => {
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: true,
      data: ["react", "hooks"],
    });
    expect(checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(generateTagSuggestions).toHaveBeenCalledWith(input);
  });

  it("title 與 content 都空白時不呼叫 AI", async () => {
    await expect(
      generateAutoTags({ title: "  ", content: "" }),
    ).resolves.toEqual({ success: false, error: AUTO_TAG_EMPTY_MESSAGE });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(generateTagSuggestions).not.toHaveBeenCalled();
  });

  it("只有 content 也可以", async () => {
    const result = await generateAutoTags({ content: "git rebase -i" });
    expect(result.success).toBe(true);
    expect(generateTagSuggestions).toHaveBeenCalledWith({
      title: "",
      content: "git rebase -i",
    });
  });

  it("格式不對的輸入回傳一般錯誤", async () => {
    await expect(generateAutoTags({ title: 42 })).resolves.toEqual({
      success: false,
      error: GENERIC_ERROR_MESSAGE,
    });
    await expect(generateAutoTags("nope")).resolves.toEqual({
      success: false,
      error: GENERIC_ERROR_MESSAGE,
    });
  });

  it("未登入時不檢查方案也不呼叫 AI", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: false,
      error: NOT_SIGNED_IN_MESSAGE,
    });
    expect(getUserIsPro).not.toHaveBeenCalled();
    expect(generateTagSuggestions).not.toHaveBeenCalled();
  });

  it("Free 使用者被擋下，不計入速率限制", async () => {
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: false,
      error: AI_PRO_MESSAGE,
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(generateTagSuggestions).not.toHaveBeenCalled();
  });

  it("超過速率限制時不呼叫 AI", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: false,
      error: "Too many attempts",
    });
    expect(generateTagSuggestions).not.toHaveBeenCalled();
  });

  it("OpenAI 的 429 對應成稍後再試", async () => {
    vi.mocked(generateTagSuggestions).mockRejectedValue(
      new OpenAI.RateLimitError(429, {}, "Rate limit", new Headers()),
    );
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: false,
      error: AI_BUSY_MESSAGE,
    });
  });

  it("其他錯誤不外流原始訊息", async () => {
    vi.mocked(generateTagSuggestions).mockRejectedValue(
      new Error("OPENAI_API_KEY is not set"),
    );
    await expect(generateAutoTags(input)).resolves.toEqual({
      success: false,
      error: AUTO_TAG_FAILED_MESSAGE,
    });
  });
});

describe("generateDescription", () => {
  const descriptionInput = {
    type: "links",
    title: "",
    content: "",
    language: "",
    url: "https://react.dev",
    fileName: "",
  };

  it("只有 url 也能產生描述，缺少的欄位補成空字串", async () => {
    await expect(
      generateDescription({ type: "links", url: "https://react.dev" }),
    ).resolves.toEqual({ success: true, data: "A debounce hook." });
    expect(checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(generateDescriptionText).toHaveBeenCalledWith(descriptionInput);
  });

  it("沒有 title、content、url、檔名時不呼叫 AI（型別與語言不算）", async () => {
    await expect(
      generateDescription({ type: "snippets", language: "typescript" }),
    ).resolves.toEqual({ success: false, error: DESCRIPTION_EMPTY_MESSAGE });
    expect(getCurrentUserId).not.toHaveBeenCalled();
  });

  it("格式不對的輸入回傳一般錯誤", async () => {
    await expect(
      generateDescription({ title: "x", url: "u".repeat(3000) }),
    ).resolves.toEqual({ success: false, error: GENERIC_ERROR_MESSAGE });
  });

  it("與自動標籤共用登入、Pro 與速率限制的檢查", async () => {
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    await expect(generateDescription(descriptionInput)).resolves.toEqual({
      success: false,
      error: AI_PRO_MESSAGE,
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(generateDescriptionText).not.toHaveBeenCalled();
  });

  it("AI 失敗時回傳描述專屬的訊息", async () => {
    vi.mocked(generateDescriptionText).mockRejectedValue(new Error("boom"));
    await expect(generateDescription(descriptionInput)).resolves.toEqual({
      success: false,
      error: DESCRIPTION_FAILED_MESSAGE,
    });
  });
});

describe("explainCode", () => {
  const explainInput = {
    type: "commands",
    title: "Reset branch",
    language: "bash",
    content: "git reset --hard origin/master",
  };

  it("Pro 使用者取得解說，記為 EXPLAIN_CODE 並寫回 token 數", async () => {
    await expect(explainCode(explainInput)).resolves.toEqual({
      success: true,
      data: "Debounces a value.",
    });
    expect(checkRateLimit).toHaveBeenCalledWith("ai", "user-1");
    expect(reserveAiUsage).toHaveBeenCalledWith(
      "user-1",
      "EXPLAIN_CODE",
      AI_DAILY_LIMIT,
    );
    expect(explainCodeText).toHaveBeenCalledWith(explainInput);
    expect(completeAiUsage).toHaveBeenCalledWith("user-1", "usage-1", {
      inputTokens: 300,
      outputTokens: 250,
    });
  });

  it("缺少的 title 與語言補成空字串", async () => {
    await explainCode({ type: "snippets", content: "const a = 1;" });
    expect(explainCodeText).toHaveBeenCalledWith({
      type: "snippets",
      title: "",
      language: "",
      content: "const a = 1;",
    });
  });

  it("content 空白時不呼叫 AI", async () => {
    await expect(
      explainCode({ ...explainInput, content: "  \n" }),
    ).resolves.toEqual({ success: false, error: EXPLAIN_EMPTY_MESSAGE });
    expect(getCurrentUserId).not.toHaveBeenCalled();
    expect(explainCodeText).not.toHaveBeenCalled();
  });

  it("snippet、command 以外的型別回傳一般錯誤", async () => {
    await expect(
      explainCode({ ...explainInput, type: "notes" }),
    ).resolves.toEqual({ success: false, error: GENERIC_ERROR_MESSAGE });
    expect(explainCodeText).not.toHaveBeenCalled();
  });

  it("Free 使用者被擋下，不計入速率限制", async () => {
    vi.mocked(getUserIsPro).mockResolvedValue(false);
    await expect(explainCode(explainInput)).resolves.toEqual({
      success: false,
      error: AI_PRO_MESSAGE,
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(explainCodeText).not.toHaveBeenCalled();
  });

  it("超過速率限制時不呼叫 AI", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    await expect(explainCode(explainInput)).resolves.toEqual({
      success: false,
      error: "Too many attempts",
    });
    expect(explainCodeText).not.toHaveBeenCalled();
  });

  it("AI 失敗時回傳解說專屬的訊息並釋放額度", async () => {
    vi.mocked(explainCodeText).mockRejectedValue(new Error("boom"));
    await expect(explainCode(explainInput)).resolves.toEqual({
      success: false,
      error: EXPLAIN_FAILED_MESSAGE,
    });
    expect(releaseAiUsage).toHaveBeenCalledWith("user-1", "usage-1");
  });
});
