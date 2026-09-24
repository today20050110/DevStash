import { cache } from "react";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types/user";

/**
 * 目前登入的使用者，由 session 的 user.id 回查資料庫。
 *
 * 不直接用 JWT 裡的 name/email：token 在過期前一直有效，使用者被刪除後
 * 仍能通過驗簽，回查一次才能確認帳號還在。未登入或查無此人時回傳 null。
 * 以 cache() 包起來：layout 的側邊欄與頁面在同一個請求內各自呼叫，只查一次。
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });
});

export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
