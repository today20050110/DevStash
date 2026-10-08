import { isPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import type { UserProfile } from "@/types/user";

/** passwordHash 只轉成布林值，雜湊本身不離開這個函式 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      passwordHash: true,
    },
  });
  if (!user) {
    return null;
  }
  const { passwordHash, ...profile } = user;
  return { ...profile, hasPassword: passwordHash !== null };
}

/** 是否為有效的 Pro 訂閱；查無使用者時視為 Free */
export async function getUserIsPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, currentPeriodEnd: true },
  });
  return user ? isPro(user) : false;
}
