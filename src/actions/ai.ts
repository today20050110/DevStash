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
import { hasDescribableContent } from "@/lib/ai-inputs";
import {
  AUTO_TAG_FAILED_MESSAGE,
  AUTO_TAG_EMPTY_MESSAGE,
  generateTagSuggestions,
} from "@/lib/ai-tags";
import { getCurrentUserId } from "@/lib/current-user";
import { getUserIsPro } from "@/lib/db/users";
import { TITLE_MAX_LENGTH } from "@/lib/item-schemas";
import { aiErrorMessage } from "@/lib/openai";
import { AI_PRO_MESSAGE, canUseAi, PRO_CONTENT_LIMIT_BYTES } from "@/lib/plan";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

export interface GenerateAutoTagsResult {
  success: boolean;
  data?: string[];
  error?: string;
}

export interface GenerateDescriptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

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

/** Zod 驗證失敗時：「內容是空的」原樣回傳，其他格式錯誤（不是使用者造成的）用一般訊息 */
function validationError(error: z.ZodError, emptyMessage: string): string {
  return error.issues[0]?.message === emptyMessage
    ? emptyMessage
    : GENERIC_ERROR_MESSAGE;
}

type AiGate = { ok: true } | { ok: false; error: string };

/** 所有 AI action 共用的檢查：登入 → Pro → 速率限制（ai 一個額度，所有功能共用） */
async function checkAiGate(): Promise<AiGate> {
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
  return { ok: true };
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
  try {
    const gate = await checkAiGate();
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }
    const tags = await generateTagSuggestions(parsed.data);
    return { success: true, data: tags };
  } catch (error) {
    console.error("Failed to generate tag suggestions", error);
    return {
      success: false,
      error: aiErrorMessage(error, AUTO_TAG_FAILED_MESSAGE),
    };
  }
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
  try {
    const gate = await checkAiGate();
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }
    const description = await generateDescriptionText(parsed.data);
    return { success: true, data: description };
  } catch (error) {
    console.error("Failed to generate description", error);
    return {
      success: false,
      error: aiErrorMessage(error, DESCRIPTION_FAILED_MESSAGE),
    };
  }
}
