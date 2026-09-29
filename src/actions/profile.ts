"use server";

import { z } from "zod";

import { signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/auth.config";
import { changePasswordSchema, emailSchema } from "@/lib/auth-schemas";
import { getCurrentUser } from "@/lib/current-user";
import { deleteUsersAndContent } from "@/lib/db/user-deletion";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetIdentifier } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export interface ChangePasswordState {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
}

export interface DeleteAccountState {
  success: boolean;
  error?: string;
}

const NOT_SIGNED_IN = "You are no longer signed in. Please sign in again.";
const GENERIC_ERROR = "Something went wrong, please try again";

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      success: false,
      fieldErrors: {
        currentPassword: fieldErrors.currentPassword?.[0],
        newPassword: fieldErrors.newPassword?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
    };
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: NOT_SIGNED_IN };
    }
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { email: true, passwordHash: true },
    });
    // 只用 GitHub 登入的帳號沒有密碼，頁面也不顯示這個表單
    if (!user?.passwordHash) {
      return {
        success: false,
        error: "This account signs in with GitHub and has no password.",
      };
    }

    const { currentPassword, newPassword } = parsed.data;
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return {
        success: false,
        fieldErrors: { currentPassword: "Current password is incorrect" },
      };
    }

    const passwordHash = await hashPassword(newPassword);
    // 密碼已換掉，尚未使用的重設連結沒有理由繼續有效
    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { passwordHash },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: resetIdentifier(user.email) },
      }),
    ]);
  } catch (error) {
    console.error("Failed to change password", error);
    return { success: false, error: GENERIC_ERROR };
  }
  return { success: true, message: "Password updated." };
}

export async function deleteAccountAction(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: NOT_SIGNED_IN };
    }
    // 輸入自己的 email 才能刪除，防止誤按；大小寫與前後空白不影響比對
    const confirmed = emailSchema.safeParse(formData.get("confirmEmail"));
    if (!confirmed.success || confirmed.data !== user.email) {
      return {
        success: false,
        error: "The email you entered doesn't match your account.",
      };
    }

    await prisma.$transaction(
      async (tx) => {
        await deleteUsersAndContent(tx, [user.id]);
        await tx.verificationToken.deleteMany({
          where: {
            identifier: { in: [user.email, resetIdentifier(user.email)] },
          },
        });
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    console.error("Failed to delete account", error);
    return { success: false, error: GENERIC_ERROR };
  }

  // signOut 以 redirect 結束，放在 try/catch 之外
  await signOut({ redirectTo: `${SIGN_IN_PATH}?deleted=1` });
  return { success: true };
}
