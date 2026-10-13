"use server";

import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
  validationFailure,
} from "@/lib/action-errors";
import { createCollectionSchema } from "@/lib/collection-schemas";
import { getCurrentUserId } from "@/lib/current-user";
import { createCollection as createCollectionInDb } from "@/lib/db/collections";
import { getUserIsPro } from "@/lib/db/users";
import { collectionLimitMessage, getCollectionLimit } from "@/lib/plan";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

export type CreateCollectionField = "name" | "description";

export interface CreateCollectionResult {
  success: boolean;
  data?: { id: string; name: string };
  error?: string;
  fieldErrors?: Partial<Record<CreateCollectionField, string>>;
}

/**
 * 新增 collection。順序：Zod 驗證 → 登入 → 速率限制 → 在 transaction 內檢查額度並建立。
 * userId 只取自 session，不接受用戶端傳入。
 */
export async function createCollection(
  data: unknown,
): Promise<CreateCollectionResult> {
  const parsed = createCollectionSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    const limit = await checkRateLimit("createCollection", userId);
    if (!limit.success) {
      return { success: false, error: rateLimitMessage(limit.reset) };
    }

    const pro = await getUserIsPro(userId);
    const result = await createCollectionInDb(
      userId,
      parsed.data,
      getCollectionLimit(pro),
    );
    if (result.status === "limit-reached") {
      return { success: false, error: collectionLimitMessage(result.limit) };
    }
    return { success: true, data: result.collection };
  } catch (error) {
    console.error("Failed to create collection", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}
