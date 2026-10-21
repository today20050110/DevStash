"use server";

import { z } from "zod";

import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
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

/**
 * 新增 dialog 的 item 還沒有 id，所以接受表單上的 title 與 content。
 * 模型只看 content 的前 2000 字元；這裡的上限只是擋住過大的請求，與 Pro 的 content 上限相同
 */
const autoTagSchema = z
  .object({
    title: z.string().max(TITLE_MAX_LENGTH).default(""),
    content: z.string().max(PRO_CONTENT_LIMIT_BYTES).default(""),
  })
  .refine((data) => data.title.trim() !== "" || data.content.trim() !== "", {
    error: AUTO_TAG_EMPTY_MESSAGE,
  });

/**
 * 依 title 與 content 建議 3–5 個標籤。順序：Zod 驗證 → 登入 → Pro → 速率限制 → OpenAI。
 * 只回傳建議，不寫入資料庫；使用者接受後由表單隨 item 一起儲存
 */
export async function generateAutoTags(
  data: unknown,
): Promise<GenerateAutoTagsResult> {
  const parsed = autoTagSchema.safeParse(data);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    return {
      success: false,
      error:
        message === AUTO_TAG_EMPTY_MESSAGE ? message : GENERIC_ERROR_MESSAGE,
    };
  }
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    if (!canUseAi(await getUserIsPro(userId))) {
      return { success: false, error: AI_PRO_MESSAGE };
    }
    const limit = await checkRateLimit("ai", userId);
    if (!limit.success) {
      return { success: false, error: rateLimitMessage(limit.reset) };
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
