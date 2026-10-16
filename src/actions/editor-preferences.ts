"use server";

import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import { getCurrentUserId } from "@/lib/current-user";
import { updateEditorPreferences as updateEditorPreferencesInDb } from "@/lib/db/users";
import {
  editorPreferencesSchema,
  type EditorPreferences,
} from "@/lib/editor-preferences";

export interface EditorPreferencesResult {
  success: boolean;
  data?: EditorPreferences;
  error?: string;
}

/**
 * 設定頁自動儲存：每次變更送出完整的偏好，整筆覆寫。
 * 只接受設定頁提供的選項值；userId 只取自 session。
 */
export async function updateEditorPreferences(
  data: unknown,
): Promise<EditorPreferencesResult> {
  const parsed = editorPreferencesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: "Invalid editor preferences" };
  }

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    await updateEditorPreferencesInDb(userId, parsed.data);
    return { success: true, data: parsed.data };
  } catch (error) {
    console.error("Failed to update editor preferences", error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}
