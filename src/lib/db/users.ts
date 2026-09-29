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
