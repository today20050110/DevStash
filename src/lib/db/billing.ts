/** Stripe 帳務相關的 User 欄位讀寫，以及 webhook 的冪等寫入 */
import { Prisma } from "@/generated/prisma/client";
import type { BillingState } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

/**
 * webhook 要更新哪個使用者：
 * - userId：checkout.session.completed 由 metadata.userId 指定
 * - customerId + subscriptionId：其他事件只知道 Stripe 的 id。matchUnset 為 true 時，
 *   stripeSubscriptionId 還是 null 的使用者也算（subscription 事件可能比 checkout 完成事件先到）；
 *   為 false 時只更新目前就是這個訂閱的使用者（舊訂閱被刪除時不能降級已換新訂閱的人）
 */
export type BillingTarget =
  | { userId: string }
  | { customerId: string; subscriptionId: string; matchUnset: boolean };

export interface BillingWrite {
  target: BillingTarget;
  data: Partial<BillingState> & { stripeCustomerId?: string };
}

function targetWhere(target: BillingTarget): Prisma.UserWhereInput {
  if ("userId" in target) {
    return { id: target.userId };
  }
  return {
    stripeCustomerId: target.customerId,
    ...(target.matchUnset
      ? {
          OR: [
            { stripeSubscriptionId: target.subscriptionId },
            { stripeSubscriptionId: null },
          ],
        }
      : { stripeSubscriptionId: target.subscriptionId }),
  };
}

/**
 * 事件紀錄與使用者更新在同一個 transaction（project-overview §4.2）。
 * StripeEvent 以 event.id 為主鍵：主鍵衝突（P2002）代表處理過，回傳 "duplicate"；
 * 其他錯誤往外拋，整個 rollback，Stripe 重送時會再處理一次
 */
export async function applyStripeEvent(
  event: { id: string; type: string },
  write: BillingWrite | null,
): Promise<"applied" | "duplicate"> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
      if (write) {
        await tx.user.updateMany({
          where: targetWhere(write.target),
          data: write.data,
        });
      }
    });
    return "applied";
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "duplicate";
    }
    throw error;
  }
}

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
