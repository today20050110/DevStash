"use server";

import { z } from "zod";

import {
  FIX_FIELDS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  validationFailure,
} from "@/lib/action-errors";
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
import { withSignedInUser } from "@/lib/signed-in-action";
import { getFileCategory, verifyUploadedFile } from "@/lib/uploads";
import type { ActionResult } from "@/types/action";
import type { FavoriteResult } from "@/types/favorites";
import type { ItemDetail, PinResult } from "@/types/items";

export type UpdateItemField =
  "title" | "description" | "content" | "language" | "url" | "tags";

/** 可能帶錯誤的欄位：文字欄位之外還有 collections 的選擇 */
export type UpdateItemErrorField = UpdateItemField | "collectionIds";

export type CreateItemField = UpdateItemErrorField | "itemTypeId" | "file";

export interface UpdateItemResult extends ActionResult<ItemDetail> {
  /** Zod 的欄位錯誤，表單顯示在對應欄位下方 */
  fieldErrors?: Partial<Record<UpdateItemErrorField, string>>;
}

export interface CreateItemResult
  extends ActionResult<{ id: string; title: string }> {
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

  return withSignedInUser("Failed to create item", async (userId) => {
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
  });
}

/** 單一欄位的錯誤；新增與編輯共用，Field 決定可用的欄位名稱 */
function fieldError<Field extends string>(field: Field, message: string) {
  return {
    success: false,
    error: FIX_FIELDS_MESSAGE,
    fieldErrors: { [field]: message } as Partial<Record<Field, string>>,
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

  return withSignedInUser("Failed to update item", async (userId) => {
    // 與新增相同的 content 上限，否則可以先建立再以編輯繞過
    const contentError = checkContentSize(
      parsed.data.content,
      await getUserIsPro(userId),
    );
    if (contentError) {
      return fieldError<UpdateItemErrorField>("content", contentError);
    }
    if (!(await ownsAllCollections(userId, parsed.data.collectionIds))) {
      return fieldError<UpdateItemErrorField>(
        "collectionIds",
        INVALID_COLLECTIONS,
      );
    }
    const item = await updateItemInDb(userId, parsedId.data, parsed.data);
    if (!item) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: item };
  });
}

export type DeleteItemResult = ActionResult;

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

  return withSignedInUser("Failed to delete item", async (userId) => {
    const deleted = await softDeleteItem(userId, parsedId.data);
    if (!deleted) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    if (deleted.storageKey) {
      await deleteStoredFile(deleted.storageKey);
    }
    return { success: true };
  });
}

/** 收藏與釘選的目標值 */
const booleanSchema = z.boolean();

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
  const parsedValue = booleanSchema.safeParse(isFavorite);
  if (!parsedValue.success) {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  return withSignedInUser("Failed to update item favorite", async (userId) => {
    if (!(await setItemFavoriteInDb(userId, parsedId.data, parsedValue.data))) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: { isFavorite: parsedValue.data } };
  });
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
  const parsedValue = booleanSchema.safeParse(isPinned);
  if (!parsedValue.success) {
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }

  return withSignedInUser("Failed to update item pin", async (userId) => {
    const saved = await setItemPinned(userId, parsedId.data, parsedValue.data);
    if (!saved) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: saved };
  });
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
