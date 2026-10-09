import type { Plan, SubscriptionStatus } from "@/generated/prisma/enums";

/** Free 方案的項目數上限（project-overview.md §6），不含已刪除的項目 */
export const FREE_ITEM_LIMIT = 50;

/** content 的大小上限（§9 第 4 題的建議值），以 UTF-8 bytes 計 */
export const FREE_CONTENT_LIMIT_BYTES = 100 * 1024;
export const PRO_CONTENT_LIMIT_BYTES = 1024 * 1024;

export interface PlanFields {
  plan: Plan;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
}

/**
 * 是否為有效的 Pro 訂閱。方案判斷集中在這裡（§6），不在各處各寫一次；
 * 已取消但還在付費期間內（currentPeriodEnd 未到）仍算 Pro。
 */
export function isPro(user: PlanFields, now = new Date()): boolean {
  return (
    user.plan === "PRO" &&
    (user.subscriptionStatus === "ACTIVE" ||
      user.subscriptionStatus === "TRIALING") &&
    (user.currentPeriodEnd ?? new Date(0)) > now
  );
}

/** 項目數上限；null 代表不限 */
export function getItemLimit(pro: boolean): number | null {
  return pro ? null : FREE_ITEM_LIMIT;
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
 * 檔案與圖片上傳（§6 規定為 Pro 限定）。開發期經使用者決定暫時對所有人開放，
 * 判斷仍只在這裡：Stripe 上線後把 FILE_UPLOADS_REQUIRE_PRO 改為 true 即可。
 */
const FILE_UPLOADS_REQUIRE_PRO = false;

export function canUploadFiles(pro: boolean): boolean {
  return pro || !FILE_UPLOADS_REQUIRE_PRO;
}
