/**
 * 各方案的上限與 Pro 限定功能。是否為 Pro 由 User.isPro 欄位決定（Stripe webhook 寫入），
 * 呼叫端傳入布林值
 */

/** Free 方案的項目數上限（project-overview.md §6），不含已刪除的項目 */
export const FREE_ITEM_LIMIT = 50;

/** content 的大小上限（§9 第 4 題的建議值），以 UTF-8 bytes 計 */
export const FREE_CONTENT_LIMIT_BYTES = 100 * 1024;
export const PRO_CONTENT_LIMIT_BYTES = 1024 * 1024;

/** 項目數上限；null 代表不限 */
export function getItemLimit(pro: boolean): number | null {
  return pro ? null : FREE_ITEM_LIMIT;
}

/** 達到項目數上限時的提示；新增 item 與申請上傳網址共用 */
export function itemLimitMessage(limit: number): string {
  return `You have reached the free tier limit of ${limit} items. Upgrade to Pro for unlimited items.`;
}

/** Free 方案的 collection 數上限（§6），不含已刪除的 collection */
export const FREE_COLLECTION_LIMIT = 3;

/** collection 數上限；null 代表不限 */
export function getCollectionLimit(pro: boolean): number | null {
  return pro ? null : FREE_COLLECTION_LIMIT;
}

export function collectionLimitMessage(limit: number): string {
  return `You have reached the free tier limit of ${limit} collections. Upgrade to Pro for unlimited collections.`;
}

export function getContentLimitBytes(pro: boolean): number {
  return pro ? PRO_CONTENT_LIMIT_BYTES : FREE_CONTENT_LIMIT_BYTES;
}

/** content 超過上限時回傳錯誤訊息，否則 null */
export function checkContentSize(
  content: string | null,
  pro: boolean,
): string | null {
  if (content === null) {
    return null;
  }
  const limit = getContentLimitBytes(pro);
  if (new TextEncoder().encode(content).length <= limit) {
    return null;
  }
  return `Content must be ${limit / 1024} KB or less`;
}

/**
 * 檔案與圖片上傳（§6 規定為 Pro 限定）。Stripe Phase 2 起啟用；
 * 判斷只在這裡，要暫時對所有人開放時把 FILE_UPLOADS_REQUIRE_PRO 改為 false。
 */
const FILE_UPLOADS_REQUIRE_PRO = true;

export function canUploadFiles(pro: boolean): boolean {
  return pro || !FILE_UPLOADS_REQUIRE_PRO;
}

/** 新增 file／image item 時，非 Pro 使用者看到的訊息 */
export const FILE_ITEMS_PRO_MESSAGE =
  "File and image uploads require a Pro subscription";

/** 申請上傳網址時，非 Pro 使用者看到的訊息 */
export const FILE_UPLOADS_PRO_MESSAGE =
  "File uploads require a Pro subscription";
