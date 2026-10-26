"use server";

import { z } from "zod";

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
  EXPLAINABLE_TYPE_SLUGS,
  hasDescribableContent,
} from "@/lib/ai-inputs";
import {
  OPTIMIZE_CONTENT_LIMIT,
  OPTIMIZE_EMPTY_MESSAGE,
  OPTIMIZE_FAILED_MESSAGE,
  OPTIMIZE_TOO_LONG_MESSAGE,
  optimizePrompt as optimizePromptText,
  type OptimizedPrompt,
} from "@/lib/ai-optimize";
import {
  AUTO_TAG_FAILED_MESSAGE,
  AUTO_TAG_EMPTY_MESSAGE,
  generateTagSuggestions,
} from "@/lib/ai-tags";
import { getCurrentUserId } from "@/lib/current-user";
import {
  completeAiUsage,
  releaseAiUsage,
  reserveAiUsage,
} from "@/lib/db/ai-usage";
import { getUserIsPro } from "@/lib/db/users";
import type { AiFeature } from "@/generated/prisma/client";
import { TITLE_MAX_LENGTH } from "@/lib/item-schemas";
import { aiErrorMessage, type AiResult } from "@/lib/openai";
import {
  AI_DAILY_LIMIT,
  AI_PRO_MESSAGE,
  aiDailyLimitMessage,
  canUseAi,
  PRO_CONTENT_LIMIT_BYTES,
} from "@/lib/plan";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import type { ActionResult } from "@/types/action";

export type GenerateAutoTagsResult = ActionResult<string[]>;
export type GenerateDescriptionResult = ActionResult<string>;
export type ExplainCodeResult = ActionResult<string>;
export type OptimizePromptResult = ActionResult<OptimizedPrompt>;

/**
 * 新增 dialog 的 item 還沒有 id，所以兩個 AI action 都接受表單上的值（使用者決定，見 docs/ai-integration-plan.md §8）。
 * 模型只看 content 的開頭；這裡的上限只是擋住過大的請求，與 Pro 的 content 上限相同
 */
const titleField = z.string().max(TITLE_MAX_LENGTH).default("");
const contentField = z.string().max(PRO_CONTENT_LIMIT_BYTES).default("");

const autoTagSchema = z
  .object({ title: titleField, content: contentField })
  .refine((data) => data.title.trim() !== "" || data.content.trim() !== "", {
    error: AUTO_TAG_EMPTY_MESSAGE,
  });

const descriptionSchema = z
  .object({
    type: z.string().max(50).default(""),
    title: titleField,
    content: contentField,
    language: z.string().max(50).default(""),
    url: z.string().max(2048).default(""),
    fileName: z.string().max(255).default(""),
  })
  .refine(hasDescribableContent, { error: DESCRIPTION_EMPTY_MESSAGE });

const explainSchema = z.object({
  type: z.enum(EXPLAINABLE_TYPE_SLUGS),
  title: titleField,
  language: z.string().max(50).default(""),
  content: contentField.refine((value) => value.trim() !== "", {
    error: EXPLAIN_EMPTY_MESSAGE,
  }),
});

const optimizeSchema = z.object({
  title: titleField,
  // 不截斷（結果會取代整段 prompt），超過上限直接拒絕
  content: z
    .string()
    .refine((value) => value.trim() !== "", { error: OPTIMIZE_EMPTY_MESSAGE })
    .refine((value) => value.trim().length <= OPTIMIZE_CONTENT_LIMIT, {
      error: OPTIMIZE_TOO_LONG_MESSAGE,
    }),
});

/**
 * Zod 驗證失敗時：使用者造成的錯誤（例如內容是空的）原樣回傳，
 * 其他格式錯誤（不是使用者造成的）用一般訊息
 */
function validationError(
  error: z.ZodError,
  ...userMessages: string[]
): string {
  const message = error.issues[0]?.message;
  return message && userMessages.includes(message)
    ? message
    : GENERIC_ERROR_MESSAGE;
}

type AiGate =
  | { ok: true; userId: string; usageId: string }
  | { ok: false; error: string };

/**
 * 所有 AI action 共用的檢查：登入 → Pro → 速率限制（Upstash 每小時 20 次，擋短時間連發）→
 * 每日上限（AiUsage 過去 24 小時 50 次，成本的真正上限）。通過時已在 AiUsage 佔住一筆
 */
async function checkAiGate(feature: AiFeature): Promise<AiGate> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { ok: false, error: NOT_SIGNED_IN_MESSAGE };
  }
  if (!canUseAi(await getUserIsPro(userId))) {
    return { ok: false, error: AI_PRO_MESSAGE };
  }
  const limit = await checkRateLimit("ai", userId);
  if (!limit.success) {
    return { ok: false, error: rateLimitMessage(limit.reset) };
  }
  const reservation = await reserveAiUsage(userId, feature, AI_DAILY_LIMIT);
  if (reservation.status === "limit-reached") {
    return { ok: false, error: aiDailyLimitMessage(reservation.resetAt) };
  }
  return { ok: true, userId, usageId: reservation.id };
}

type AiRun<T> = { success: true; data: T } | { success: false; error: string };

/**
 * 檢查通過後呼叫 AI：成功時把 token 數寫回佔住的 AiUsage，失敗時刪除它（失敗的請求不吃額度）。
 * 錯誤一律換成固定訊息，原始錯誤只留在伺服器 log
 */
async function runAiFeature<T>(
  feature: AiFeature,
  failedMessage: string,
  generate: () => Promise<AiResult<T>>,
): Promise<AiRun<T>> {
  let usage: { userId: string; id: string } | null = null;
  try {
    const gate = await checkAiGate(feature);
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }
    usage = { userId: gate.userId, id: gate.usageId };
    const result = await generate();
    await completeAiUsage(usage.userId, usage.id, result.usage);
    return { success: true, data: result.value };
  } catch (error) {
    console.error(`AI ${feature} failed`, error);
    if (usage) {
      // 釋放失敗只會讓這次失敗的請求多佔一個名額，不影響回給使用者的訊息
      try {
        await releaseAiUsage(usage.userId, usage.id);
      } catch (releaseError) {
        console.error("Failed to release AI usage", releaseError);
      }
    }
    return { success: false, error: aiErrorMessage(error, failedMessage) };
  }
}

/**
 * 依 title 與 content 建議 3–5 個標籤。順序：Zod 驗證 → 登入 → Pro → 速率限制 → OpenAI。
 * 只回傳建議，不寫入資料庫；使用者接受後由表單隨 item 一起儲存
 */
export async function generateAutoTags(
  data: unknown,
): Promise<GenerateAutoTagsResult> {
  const parsed = autoTagSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: validationError(parsed.error, AUTO_TAG_EMPTY_MESSAGE),
    };
  }
  return runAiFeature("AUTO_TAG", AUTO_TAG_FAILED_MESSAGE, () =>
    generateTagSuggestions(parsed.data),
  );
}

/**
 * 依表單上目前的值產生 1–2 句描述，所有型別都適用（只用該型別有的欄位）。
 * 流程與 generateAutoTags 相同；只回傳文字，由表單填入 Description 欄位
 */
export async function generateDescription(
  data: unknown,
): Promise<GenerateDescriptionResult> {
  const parsed = descriptionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: validationError(parsed.error, DESCRIPTION_EMPTY_MESSAGE),
    };
  }
  return runAiFeature("SUMMARIZE", DESCRIPTION_FAILED_MESSAGE, () =>
    generateDescriptionText(parsed.data),
  );
}

/**
 * 解說 drawer 上的 snippet／command，回傳約 200–300 字的 Markdown。
 * 流程與其他 AI action 相同；不存進資料庫，每次點擊都重新產生
 */
export async function explainCode(data: unknown): Promise<ExplainCodeResult> {
  const parsed = explainSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: validationError(parsed.error, EXPLAIN_EMPTY_MESSAGE),
    };
  }
  return runAiFeature("EXPLAIN_CODE", EXPLAIN_FAILED_MESSAGE, () =>
    explainCodeText(parsed.data),
  );
}

/**
 * 檢視 drawer 上的 prompt，需要時回傳改寫後的版本與改了什麼；improved 為 false 表示不需要修改。
 * 只回傳建議，不寫入資料庫；使用者採用後進入編輯模式，按 Save 才儲存
 */
export async function optimizePrompt(
  data: unknown,
): Promise<OptimizePromptResult> {
  const parsed = optimizeSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: validationError(
        parsed.error,
        OPTIMIZE_EMPTY_MESSAGE,
        OPTIMIZE_TOO_LONG_MESSAGE,
      ),
    };
  }
  return runAiFeature("OPTIMIZE_PROMPT", OPTIMIZE_FAILED_MESSAGE, () =>
    optimizePromptText(parsed.data),
  );
}
