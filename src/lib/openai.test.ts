import OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AI_BUSY_MESSAGE,
  AI_TIMEOUT_MESSAGE,
  aiErrorMessage,
} from "@/lib/openai";

describe("aiErrorMessage", () => {
  it("429 提示稍後再試", () => {
    const error = new OpenAI.RateLimitError(429, {}, "Rate limit", new Headers());
    expect(aiErrorMessage(error, "fallback")).toBe(AI_BUSY_MESSAGE);
  });

  it("帳號額度用完的 429 不提示稍後再試", () => {
    const error = new OpenAI.RateLimitError(
      429,
      { type: "insufficient_quota", code: "credit_balance_exhausted" },
      "No credits",
      new Headers(),
    );
    expect(aiErrorMessage(error, "fallback")).toBe("fallback");
  });

  it("逾時有專屬訊息", () => {
    expect(
      aiErrorMessage(new OpenAI.APIConnectionTimeoutError(), "fallback"),
    ).toBe(AI_TIMEOUT_MESSAGE);
  });

  it("其他錯誤用 fallback", () => {
    expect(aiErrorMessage(new Error("boom"), "fallback")).toBe("fallback");
  });
});

describe("getOpenAI", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("沒有 OPENAI_API_KEY 時丟錯", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const { getOpenAI } = await import("@/lib/openai");
    expect(() => getOpenAI()).toThrow("OPENAI_API_KEY is not set");
  });

  it("有金鑰時建立並重複使用同一個 client", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const { getOpenAI } = await import("@/lib/openai");
    expect(getOpenAI()).toBe(getOpenAI());
  });
});
