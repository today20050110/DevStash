import type { EditorPreferences } from "@/lib/editor-preferences";
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

/** 是否為 Pro（User.isPro，由 Stripe webhook 寫入）；查無使用者時視為 Free */
export async function getUserIsPro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true },
  });
  return user?.isPro ?? false;
}

/** 整筆覆寫編輯器偏好；呼叫端已以 editorPreferencesSchema 驗證 */
export async function updateEditorPreferences(
  userId: string,
  preferences: EditorPreferences,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { editorPreferences: preferences },
  });
}
