"use server";

import { z } from "zod";

import { GENERIC_ERROR_MESSAGE, validationFailure } from "@/lib/action-errors";
import { collectionSchema } from "@/lib/collection-schemas";
import {
  createCollection as createCollectionInDb,
  setCollectionFavorite as setCollectionFavoriteInDb,
  softDeleteCollection,
  updateCollection as updateCollectionInDb,
} from "@/lib/db/collections";
import { getUserIsPro } from "@/lib/db/users";
import { collectionLimitMessage, getCollectionLimit } from "@/lib/plan";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { withSignedInUser } from "@/lib/signed-in-action";
import type { ActionResult } from "@/types/action";
import type { FavoriteResult } from "@/types/favorites";

export type CollectionField = "name" | "description";

/** 新增與編輯共用的回應；表單依 fieldErrors 在欄位下方顯示錯誤 */
export interface CollectionResult
  extends ActionResult<{ id: string; name: string }> {
  fieldErrors?: Partial<Record<CollectionField, string>>;
}

export type DeleteCollectionResult = ActionResult;

const COLLECTION_NOT_FOUND = "Collection not found";

const collectionIdSchema = z.string().min(1);

/**
 * 新增 collection。順序：Zod 驗證 → 登入 → 速率限制 → 在 transaction 內檢查額度並建立。
 * userId 只取自 session，不接受用戶端傳入。
 */
export async function createCollection(
  data: unknown,
): Promise<CollectionResult> {
  const parsed = collectionSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  return withSignedInUser("Failed to create collection", async (userId) => {
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
  });
}

/**
 * 編輯 collection 的 name 與 description。擁有者在寫入條件中確認，
 * 不屬於目前使用者、不存在或已刪除的一律回「Collection not found」。
 */
export async function updateCollection(
  collectionId: unknown,
  data: unknown,
): Promise<CollectionResult> {
  const parsedId = collectionIdSchema.safeParse(collectionId);
  if (!parsedId.success) {
    return { success: false, error: COLLECTION_NOT_FOUND };
  }
  const parsed = collectionSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  return withSignedInUser("Failed to update collection", async (userId) => {
    const updated = await updateCollectionInDb(
      userId,
      parsedId.data,
      parsed.data,
    );
    if (!updated) {
      return { success: false, error: COLLECTION_NOT_FOUND };
    }
    return { success: true, data: updated };
  });
}

const isFavoriteSchema = z.boolean();

/**
 * 設定 collection 的收藏狀態（傳入目標值，不是翻轉）。
 * 不屬於目前使用者、不存在或已刪除時一律回「Collection not found」。
 */
export async function setCollectionFavorite(
  collectionId: unknown,
  isFavorite: unknown,
): Promise<FavoriteResult> {
  const parsedId = collectionIdSchema.safeParse(collectionId);
  if (!parsedId.success) {
    return { success: false, error: COLLECTION_NOT_FOUND };
  }
  const parsedValue = isFavoriteSchema.safeParse(isFavorite);
  if (!parsedValue.success) {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  return withSignedInUser(
    "Failed to update collection favorite",
    async (userId) => {
      const updated = await setCollectionFavoriteInDb(
        userId,
        parsedId.data,
        parsedValue.data,
      );
      if (!updated) {
        return { success: false, error: COLLECTION_NOT_FOUND };
      }
      return { success: true, data: { isFavorite: parsedValue.data } };
    },
  );
}

/**
 * 軟刪除 collection；裡面的 item 不受影響，只是不再屬於它。
 * 不屬於目前使用者、不存在或已刪除時一律回「Collection not found」。
 */
export async function deleteCollection(
  collectionId: unknown,
): Promise<DeleteCollectionResult> {
  const parsedId = collectionIdSchema.safeParse(collectionId);
  if (!parsedId.success) {
    return { success: false, error: COLLECTION_NOT_FOUND };
  }

  return withSignedInUser("Failed to delete collection", async (userId) => {
    if (!(await softDeleteCollection(userId, parsedId.data))) {
      return { success: false, error: COLLECTION_NOT_FOUND };
    }
    return { success: true };
  });
}
