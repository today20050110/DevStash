import OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateAutoTags } from "@/actions/ai";
import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import {
  AUTO_TAG_EMPTY_MESSAGE,
  AUTO_TAG_FAILED_MESSAGE,
  generateTagSuggestions,
} from "@/lib/ai-tags";
import { getCurrentUserId } from "@/lib/current-user";
import { getUserIsPro } from "@/lib/db/users";
import { AI_BUSY_MESSAGE } from "@/lib/openai";
import { AI_PRO_MESSAGE } from "@/lib/plan";
import { checkRateLimit } from "@/lib/rate-limit";

// action 的測試只驗證流程（驗證、登入、Pro、速率限制、錯誤對應）；
// 解析與截斷在 src/lib/ai-tags.test.ts，OpenAI 不會被真的呼叫
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: vi.fn() }));
vi.mock("@/lib/db/users", () => ({ getUserIsPro: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  rateLimitMessage: () => "Too many attempts",
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
  vi.mocked(generateTagSuggestions).mockResolvedValue(["react", "hooks"]);
  vi.spyOn(console, "error").mockImplementation(() => {});
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
