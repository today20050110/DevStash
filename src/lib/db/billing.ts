/** Stripe 帳務相關的 User 欄位讀寫；訂閱狀態的同步由 Phase 2 的 webhook 處理 */
import { prisma } from "@/lib/prisma";

export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  return user?.stripeCustomerId ?? null;
}

/**
 * 只在還沒有 customer 時寫入：同時送出兩次結帳時，各自建立的 customer 不會互相覆蓋。
 * 回傳 false 代表別的請求先寫入了，呼叫端改用資料庫裡的值
 */
export async function saveStripeCustomerId(
  userId: string,
  customerId: string,
): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { id: userId, stripeCustomerId: null },
    data: { stripeCustomerId: customerId },
  });
  return result.count === 1;
}
