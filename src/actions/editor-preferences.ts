"use server";

import { updateEditorPreferences as updateEditorPreferencesInDb } from "@/lib/db/users";
import {
  editorPreferencesSchema,
  type EditorPreferences,
} from "@/lib/editor-preferences";
import { withSignedInUser } from "@/lib/signed-in-action";
import type { ActionResult } from "@/types/action";

export type EditorPreferencesResult = ActionResult<EditorPreferences>;

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

  return withSignedInUser(
    "Failed to update editor preferences",
    async (userId) => {
      await updateEditorPreferencesInDb(userId, parsed.data);
      return { success: true, data: parsed.data };
    },
  );
}
