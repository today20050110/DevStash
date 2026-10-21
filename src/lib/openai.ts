import OpenAI from "openai";

/** 全站 AI 功能使用的模型；換模型只改這裡（docs/ai-integration-plan.md §1） */
export const AI_MODEL = "gpt-5.6-luna";

let client: OpenAI | null = null;

/**
 * 伺服器端的 OpenAI client，第一次呼叫時才建立並快取（與 getStripe 相同）：
 * 缺 OPENAI_API_KEY 時只有實際呼叫 AI 的請求失敗，不會讓 build 失敗。
 * 互動功能不需要 SDK 預設 10 分鐘的逾時；429／5xx／連線錯誤由 SDK 自動重試一次
 */
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey, timeout: 30_000, maxRetries: 1 });
  }
  return client;
}

export interface AiTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** AI 功能的結果與這次呼叫用掉的 tokens（寫入 AiUsage） */
export interface AiResult<T> {
  value: T;
  usage: AiTokenUsage;
}

/** 寫入 AiUsage 的 token 數；回應沒有 usage 時記 0（仍算一次呼叫） */
export function toTokenUsage(
  usage: { input_tokens: number; output_tokens: number } | null | undefined,
): AiTokenUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

export const AI_BUSY_MESSAGE =
  "AI is busy right now, please try again in a moment";
export const AI_TIMEOUT_MESSAGE = "The AI request timed out, please try again";

/**
 * AI 呼叫失敗時給使用者的訊息。OpenAI 的原始錯誤訊息可能含請求細節，一律換成固定的文字；
 * 429 與逾時有專屬訊息，其他（缺金鑰、5xx、無法解析的回應）用呼叫端的 fallback。
 * 帳號額度用完也是 429，但重試不會好，不提示「稍後再試」；它的 type 是 insufficient_quota
 * （code 則會變，實測為 credit_balance_exhausted），所以看 type
 */
export function aiErrorMessage(error: unknown, fallback: string): string {
  if (
    error instanceof OpenAI.RateLimitError &&
    error.type !== "insufficient_quota"
  ) {
    return AI_BUSY_MESSAGE;
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return AI_TIMEOUT_MESSAGE;
  }
  return fallback;
}
