"use server";

import { z } from "zod";

import { getCurrentUserId } from "@/lib/current-user";
import {
  createItem as createItemInDb,
  findCreatableItemType,
  recordPendingDeletion,
  softDeleteItem,
  updateItem as updateItemInDb,
  type NewItemFile,
} from "@/lib/db/items";
import { getUserIsPro } from "@/lib/db/users";
import { createItemSchema, updateItemSchema } from "@/lib/item-schemas";
import { canUploadFiles, checkContentSize, getItemLimit } from "@/lib/plan";
import { deleteObject } from "@/lib/r2";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";
import { getFileCategory, verifyUploadedFile } from "@/lib/uploads";
import type { ItemDetail } from "@/types/items";

export type UpdateItemField =
  "title" | "description" | "content" | "language" | "url" | "tags";

export type CreateItemField = UpdateItemField | "itemTypeId" | "file";

export interface UpdateItemResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
  /** Zod 的欄位錯誤，表單顯示在對應欄位下方 */
  fieldErrors?: Partial<Record<UpdateItemField, string>>;
}

export interface CreateItemResult {
  success: boolean;
  data?: { id: string; title: string };
  error?: string;
  fieldErrors?: Partial<Record<CreateItemField, string>>;
}

const NOT_SIGNED_IN = "You are no longer signed in. Please sign in again.";
const ITEM_NOT_FOUND = "Item not found";
const GENERIC_ERROR = "Something went wrong, please try again";
const FIX_FIELDS = "Please fix the highlighted fields";

const itemIdSchema = z.string().min(1);

/**
 * 新增 item。順序：Zod 驗證 → 登入 → 速率限制 → 型別（只能是可新增的型別）→
 * 依型別的必填與 content 上限（FILE 型別確認 R2 上的檔案）→ 在 transaction 內檢查額度並建立。
 */
export async function createItem(data: unknown): Promise<CreateItemResult> {
  const parsed = createItemSchema.safeParse(data);
  if (!parsed.success) {
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);
    return {
      success: false,
      error: formErrors[0] ?? FIX_FIELDS,
      fieldErrors: firstErrors(fieldErrors),
    };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN };
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
    const pro = await getUserIsPro(userId);
    const contentError =
      itemType.kind === "TEXT" ? checkContentSize(fields.content, pro) : null;
    if (contentError) {
      return fieldError("content", contentError);
    }

    let file: NewItemFile | null = null;
    if (itemType.kind === "FILE") {
      const category = getFileCategory(itemType);
      if (!category || !canUploadFiles(pro)) {
        return fieldError("itemTypeId", "Choose a valid type");
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
        error: `The Free plan is limited to ${result.limit} items. Delete an item or upgrade to Pro to add more.`,
      };
    }
    return { success: true, data: result.item };
  } catch (error) {
    console.error("Failed to create item", error);
    return { success: false, error: GENERIC_ERROR };
  }
}

function fieldError(field: CreateItemField, message: string): CreateItemResult {
  return {
    success: false,
    error: FIX_FIELDS,
    fieldErrors: { [field]: message },
  };
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
    const { formErrors, fieldErrors } = z.flattenError(parsed.error);
    return {
      success: false,
      error: formErrors[0] ?? FIX_FIELDS,
      fieldErrors: firstErrors(fieldErrors),
    };
  }

  try {
    // getCurrentUserId() 回查資料庫並比對 sessionVersion，重設密碼後的舊 token 會被擋下
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN };
    }
    // 與新增相同的 content 上限，否則可以先建立再以編輯繞過
    const contentError = checkContentSize(
      parsed.data.content,
      await getUserIsPro(userId),
    );
    if (contentError) {
      return {
        success: false,
        error: FIX_FIELDS,
        fieldErrors: { content: contentError },
      };
    }
    const item = await updateItemInDb(userId, parsedId.data, parsed.data);
    if (!item) {
      return { success: false, error: ITEM_NOT_FOUND };
    }
    return { success: true, data: item };
  } catch (error) {
    console.error("Failed to update item", error);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** 每個欄位只顯示第一則錯誤；tags 陣列中個別元素的錯誤也歸到 tags */
function firstErrors<Field extends string>(
  fieldErrors: Partial<Record<Field, string[]>>,
): Partial<Record<Field, string>> {
  return Object.fromEntries(
    Object.entries<string[] | undefined>(fieldErrors).map(
      ([field, messages]) => [field, messages?.[0]],
    ),
  ) as Partial<Record<Field, string>>;
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
      return { success: false, error: NOT_SIGNED_IN };
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
    return { success: false, error: GENERIC_ERROR };
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
