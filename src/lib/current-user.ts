import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types/user";

const DEMO_USER_EMAIL = "demo@devstash.io";

/**
 * 暫時的「目前使用者」。Auth.js 尚未接上，先以 seed 的 demo 使用者代替；
 * 接上 Auth 後改為讀 session，呼叫端不必改動。
 *
 * 找不到時回傳 null（例如 production 刻意沒有 demo 資料），由呼叫端顯示空狀態。
 * 以 cache() 包起來：layout 的側邊欄與頁面在同一個請求內各自呼叫，只查一次。
 */
export const getCurrentUser = cache(
  (): Promise<CurrentUser | null> =>
    prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { id: true, name: true, email: true },
    }),
);

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
