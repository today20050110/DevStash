"use server";

import { z } from "zod";

import { getCurrentUserId } from "@/lib/current-user";
import { updateItem as updateItemInDb } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/item-schemas";
import type { ItemDetail } from "@/types/items";

export type UpdateItemField =
  "title" | "description" | "content" | "language" | "url" | "tags";

export interface UpdateItemResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
  /** Zod 的欄位錯誤，表單顯示在對應欄位下方 */
  fieldErrors?: Partial<Record<UpdateItemField, string>>;
}

const NOT_SIGNED_IN = "You are no longer signed in. Please sign in again.";
const ITEM_NOT_FOUND = "Item not found";
const GENERIC_ERROR = "Something went wrong, please try again";

const itemIdSchema = z.string().min(1);

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
      error: formErrors[0] ?? "Please fix the highlighted fields",
      fieldErrors: firstErrors(fieldErrors),
    };
  }

  try {
    // getCurrentUserId() 回查資料庫並比對 sessionVersion，重設密碼後的舊 token 會被擋下
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN };
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
function firstErrors(
  fieldErrors: Partial<Record<UpdateItemField, string[]>>,
): Partial<Record<UpdateItemField, string>> {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ]),
  );
}
