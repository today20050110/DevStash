import { randomUUID } from "node:crypto";

import type { NewItemFile } from "@/lib/db/item-mutations";
import { findCreatableItemType } from "@/lib/db/item-types";
import { countActiveItems, isStorageKeyInUse } from "@/lib/db/items";
import { getUserIsPro } from "@/lib/db/users";
import {
  buildStorageKey,
  getUploadCategory,
  isOwnStorageKey,
  validateUpload,
  type UploadCategory,
} from "@/lib/file-types";
import { canUploadFiles, getItemLimit, itemLimitMessage } from "@/lib/plan";
import { createUploadUrl, deleteObject, headObject } from "@/lib/r2";
import type { CreatableItemType } from "@/types/items";

export type PrepareUploadResult =
  | { ok: true; uploadUrl: string; storageKey: string; mimeType: string }
  | {
      ok: false;
      reason:
        "invalid-type" | "invalid-file" | "pro-required" | "limit-reached";
      error: string;
    };

/**
 * 簽發 presigned PUT 網址之前的所有檢查：型別必須是 FILE kind 且可上傳、
 * 方案允許上傳、還沒達到項目數上限（不讓使用者傳完才發現不能建立）、
 * 副檔名與大小符合白名單。key 由伺服器產生。
 */
export async function prepareUpload(
  userId: string,
  input: { itemTypeId: string; fileName: string; size: number },
): Promise<PrepareUploadResult> {
  const itemType = await findCreatableItemType(userId, input.itemTypeId);
  const category = itemType && getFileCategory(itemType);
  if (!category) {
    return { ok: false, reason: "invalid-type", error: "Choose a file type" };
  }

  const pro = await getUserIsPro(userId);
  if (!canUploadFiles(pro)) {
    return {
      ok: false,
      reason: "pro-required",
      error: "File and image uploads require the Pro plan",
    };
  }
  const limit = getItemLimit(pro);
  if (limit !== null && (await countActiveItems(userId)) >= limit) {
    return {
      ok: false,
      reason: "limit-reached",
      error: itemLimitMessage(limit),
    };
  }

  const validation = validateUpload(category, input.fileName, input.size);
  if (!validation.ok) {
    return { ok: false, reason: "invalid-file", error: validation.error };
  }

  const storageKey = buildStorageKey(
    userId,
    randomUUID(),
    validation.extension,
  );
  const uploadUrl = await createUploadUrl(
    storageKey,
    validation.mimeType,
    input.size,
  );
  return { ok: true, uploadUrl, storageKey, mimeType: validation.mimeType };
}

/** FILE kind 且有上傳規則的型別才能上傳；其他型別回傳 null */
export function getFileCategory(
  itemType: Pick<CreatableItemType, "kind" | "slug">,
): UploadCategory | null {
  return itemType.kind === "FILE" ? getUploadCategory(itemType.slug) : null;
}

export type VerifyUploadResult =
  { ok: true; file: NewItemFile } | { ok: false; error: string };

const UPLOAD_MISSING =
  "The upload was not found. Please upload the file again.";

/**
 * 建立 item 前確認上傳的檔案：key 是伺服器替這個使用者產生的、還沒被其他 item 使用、
 * R2 上確實存在，且實際大小與類型（而非前端宣稱的）符合該型別的規則。
 * 大小或類型不符時一併刪除 R2 物件，不留孤兒。
 */
export async function verifyUploadedFile(
  userId: string,
  category: UploadCategory,
  storageKey: string | null,
  fileName: string | null,
): Promise<VerifyUploadResult> {
  if (!storageKey || !fileName) {
    return { ok: false, error: "Upload a file first" };
  }
  if (!isOwnStorageKey(storageKey, userId)) {
    return { ok: false, error: UPLOAD_MISSING };
  }
  if (await isStorageKeyInUse(userId, storageKey)) {
    return { ok: false, error: UPLOAD_MISSING };
  }
  const stored = await headObject(storageKey);
  if (!stored) {
    return { ok: false, error: UPLOAD_MISSING };
  }

  const validation = validateUpload(category, fileName, stored.size);
  // 副檔名必須與簽發網址時相同（key 的副檔名），Content-Type 必須是簽章時指定的那個
  if (
    !validation.ok ||
    !storageKey.endsWith(`.${validation.extension}`) ||
    stored.contentType !== validation.mimeType
  ) {
    await deleteObject(storageKey).catch((error: unknown) => {
      console.error("Failed to delete rejected upload", error);
    });
    return {
      ok: false,
      error: validation.ok
        ? "The uploaded file does not match"
        : validation.error,
    };
  }

  return {
    ok: true,
    file: {
      storageKey,
      fileName,
      fileSize: stored.size,
      mimeType: validation.mimeType,
    },
  };
}
