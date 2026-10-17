"use server";

import { z } from "zod";

import {
  FIX_FIELDS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
  validationFailure,
} from "@/lib/action-errors";
import { getCurrentUserId } from "@/lib/current-user";
import {
  createItem as createItemInDb,
  recordPendingDeletion,
  setItemFavorite as setItemFavoriteInDb,
  setItemPinned,
  softDeleteItem,
  updateItem as updateItemInDb,
  type NewItemFile,
} from "@/lib/db/item-mutations";
import { findOwnedCollectionIds } from "@/lib/db/collections";
import { findCreatableItemType } from "@/lib/db/item-types";
import { getUserIsPro } from "@/lib/db/users";
import { createItemSchema, updateItemSchema } from "@/lib/item-schemas";
import {
  canUploadFiles,
  checkContentSize,
  FILE_ITEMS_PRO_MESSAGE,
  getItemLimit,
  itemLimitMessage,
} from "@/lib/plan";
import { deleteObject } from "@/lib/r2";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { getFileCategory, verifyUploadedFile } from "@/lib/uploads";
import type { FavoriteResult } from "@/types/favorites";
import type { ItemDetail, PinResult } from "@/types/items";

export type UpdateItemField =
  "title" | "description" | "content" | "language" | "url" | "tags";

/** 可能帶錯誤的欄位：文字欄位之外還有 collections 的選擇 */
export type UpdateItemErrorField = UpdateItemField | "collectionIds";

export type CreateItemField = UpdateItemErrorField | "itemTypeId" | "file";

export interface UpdateItemResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
  /** Zod 的欄位錯誤，表單顯示在對應欄位下方 */
  fieldErrors?: Partial<Record<UpdateItemErrorField, string>>;
}

export interface CreateItemResult {
  success: boolean;
  data?: { id: string; title: string };
  error?: string;
  fieldErrors?: Partial<Record<CreateItemField, string>>;
}

const ITEM_NOT_FOUND = "Item not found";
const INVALID_COLLECTIONS = "Choose valid collections";

const itemIdSchema = z.string().min(1);

/**
 * 新增 item。順序：Zod 驗證 → 登入 → 速率限制 → 型別（只能是可新增的型別）→
 * 依型別的必填、collections 的擁有者與 content 上限（FILE 型別確認 R2 上的檔案）→ 在 transaction 內檢查額度並建立。
 */
export async function createItem(data: unknown): Promise<CreateItemResult> {
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    const limit = await checkRateLimit("createItem", userId);
    if (!limit.success) {
      return { success: false, error: rateLimitMessage(limit.reset) };
    }

    const { itemTypeId, storageKey, fileName, ...fields } = parsed.data;
    const itemType = await findCreatableItemType(userId, itemTypeId);
    if (!itemType) {
      return fieldError("itemTypeId", "Choose a valid type");
    }
    if (itemType.kind === "URL" && fields.url === null) {
      return fieldError("url", "URL is required");
    }
    if (!(await ownsAllCollections(userId, fields.collectionIds))) {
      return fieldError("collectionIds", INVALID_COLLECTIONS);
    }
    const pro = await getUserIsPro(userId);
    const contentError =
      itemType.kind === "TEXT" ? checkContentSize(fields.content, pro) : null;
    if (contentError) {
      return fieldError("content", contentError);
    }

    let file: NewItemFile | null = null;
    if (itemType.kind === "FILE") {
      const category = getFileCategory(itemType);
      if (!category) {
        return fieldError("itemTypeId", "Choose a valid type");
      }
      if (!canUploadFiles(pro)) {
        return { success: false, error: FILE_ITEMS_PRO_MESSAGE };
      }
      const upload = await verifyUploadedFile(
        userId,
        category,
        storageKey,
        fileName,
      );
      if (!upload.ok) {
        return fieldError("file", upload.error);
      }
      file = upload.file;
    }

    const result = await createItemInDb(
      userId,
      itemType,
      fields,
      getItemLimit(pro),
      file,
    );
    if (result.status === "file-in-use") {
      return fieldError(
        "file",
        "The upload was not found. Please upload the file again.",
      );
    }
    if (result.status === "limit-reached") {
      return {
        success: false,
        error: itemLimitMessage(result.limit),
      };
    }
    return { success: true, data: result.item };
  } catch (error) {
    console.error("Failed to create item", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

function fieldError(field: CreateItemField, message: string): CreateItemResult {
  return {
    success: false,
    error: FIX_FIELDS_MESSAGE,
    fieldErrors: { [field]: message },
  };
}

/**
 * 選的 collections 是否全部屬於該使用者且未刪除。寫入時還會再篩一次，
 * 這裡先擋下來，讓使用者看到錯誤而不是默默少加了幾個
 */
async function ownsAllCollections(
  userId: string,
  collectionIds: string[],
): Promise<boolean> {
  const owned = await findOwnedCollectionIds(userId, collectionIds);
  return owned.length === collectionIds.length;
}

/**
 * 更新 item 的可編輯欄位。先以 Zod 驗證再碰資料庫；擁有者在查詢條件中確認，
 * 不屬於目前使用者的 item 與不存在的一樣回「Item not found」。
 */
export async function updateItem(
  itemId: unknown,
  data: unknown,
): Promise<UpdateItemResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) {
    return { success: false, error: ITEM_NOT_FOUND };
  }
  const parsed = updateItemSchema.safeParse(data);
  if (!parsed.success) {
    return validationFailure(parsed.error);
  }

  try {
    // getCurrentUserId() 回查資料庫並比對 sessionVersion，重設密碼後的舊 token 會被擋下
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    // 與新增相同的 content 上限，否則可以先建立再以編輯繞過
    const contentError = checkContentSize(
      parsed.data.content,
      await getUserIsPro(userId),
    );
    if (contentError) {
      return {
        success: false,
        error: FIX_FIELDS_MESSAGE,
        fieldErrors: { content: contentError },
      };
    }
    if (!(await ownsAllCollections(userId, parsed.data.collectionIds))) {
      return {
        success: false,
        error: FIX_FIELDS_MESSAGE,
        fieldErrors: { collectionIds: INVALID_COLLECTIONS },
      };
    }
    const item = await updateItemInDb(userId, parsedId.data, parsed.data);
    if (!item) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to update item", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

export interface DeleteItemResult {
  success: boolean;
  error?: string;
}

/**
 * 軟刪除 item；不屬於目前使用者、不存在或已刪除時一律回「Item not found」。
 * FILE 型別一併刪除 R2 物件（使用者決定：不等永久清除）；R2 刪除失敗不影響 item 的刪除，
 * 記入 PendingDeletion 留給 sweeper 重試。
 */
export async function deleteItem(itemId: unknown): Promise<DeleteItemResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) {
    return { success: false, error: ITEM_NOT_FOUND };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    const deleted = await softDeleteItem(userId, parsedId.data);
    if (!deleted) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    if (deleted.storageKey) {
      await deleteStoredFile(deleted.storageKey);
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to delete item", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

const isFavoriteSchema = z.boolean();

/**
 * 設定 item 的收藏狀態（傳入目標值，不是翻轉）。
 * 不屬於目前使用者、不存在或已刪除時一律回「Item not found」。
 */
export async function setItemFavorite(
  itemId: unknown,
  isFavorite: unknown,
): Promise<FavoriteResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) {
    return { success: false, error: ITEM_NOT_FOUND };
  }
  const parsedValue = isFavoriteSchema.safeParse(isFavorite);
  if (!parsedValue.success) {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    if (!(await setItemFavoriteInDb(userId, parsedId.data, parsedValue.data))) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: { isFavorite: parsedValue.data } };
  } catch (error) {
    console.error("Failed to update item favorite", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

/**
 * 設定 item 的釘選狀態（傳入目標值，不是翻轉；重複送出不會出錯），錯誤對應與 setItemFavorite 相同。
 * 回傳寫入的 pinnedAt，drawer 以它更新狀態
 */
export async function toggleItemPin(
  itemId: unknown,
  isPinned: unknown,
): Promise<PinResult> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) {
    return { success: false, error: ITEM_NOT_FOUND };
  }
  const parsedValue = z.boolean().safeParse(isPinned);
  if (!parsedValue.success) {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    const saved = await setItemPinned(userId, parsedId.data, parsedValue.data);
    if (!saved) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: saved };
  } catch (error) {
    console.error("Failed to update item pin", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}

async function deleteStoredFile(storageKey: string): Promise<void> {
  try {
    await deleteObject(storageKey);
  } catch (error) {
    console.error("Failed to delete file from R2", error);
    // item 已經刪除；連記錄都失敗時只留 log，不讓使用者以為刪除失敗
    await recordPendingDeletion(storageKey, error).catch((recordError) => {
      console.error("Failed to record pending deletion", recordError);
    });
  }
}
