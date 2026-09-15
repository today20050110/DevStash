import { prisma } from "@/lib/prisma";

const DEMO_USER_EMAIL = "demo@devstash.io";

/**
 * 暫時的「目前使用者」。Auth.js 尚未接上，先以 seed 的 demo 使用者代替；
 * 接上 Auth 後改為讀 session.user.id，呼叫端不必改動。
 *
 * 找不到時回傳 null（例如 production 刻意沒有 demo 資料），由呼叫端顯示空狀態。
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: { id: true },
  });
  return user?.id ?? null;
}
