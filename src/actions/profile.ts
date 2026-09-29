"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/auth.config";
import { changePasswordSchema, emailSchema } from "@/lib/auth-schemas";
import { getCurrentUser } from "@/lib/current-user";
import { deleteUsersAndContent } from "@/lib/db/user-deletion";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetIdentifier } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

export interface ChangePasswordState {
  success: boolean;
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

  let email: string;
  let reissued: boolean;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: NOT_SIGNED_IN };
    }
    // 以帳號為鍵：拿到已登入瀏覽器的人不能用這個表單無限次猜目前的密碼
    const limit = await checkRateLimit("changePassword", currentUser.id);
    if (!limit.success) {
      return { success: false, error: rateLimitMessage(limit.reset) };
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
    // 版本加一讓其他裝置的登入失效；密碼已換掉，尚未使用的重設連結也沒有理由繼續有效
    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: resetIdentifier(user.email) },
      }),
    ]);

    // 目前這台裝置的 token 也跟著失效：以新密碼重新登入換發一張。
    // 走 authorize 驗證密碼，而不是 update()，理由見 auth.ts 的 jwt callback
    email = user.email;
    reissued = await reissueSession(email, newPassword);
  } catch (error) {
    console.error("Failed to change password", error);
    return { success: false, error: GENERIC_ERROR };
  }

  // redirect 以例外結束，放在 try/catch 之外
  if (!reissued) {
    // 這台裝置實際上已經登出：直接到登入頁，沿用重設密碼成功的提示
    redirect(`${SIGN_IN_PATH}?${new URLSearchParams({ reset: "1", email })}`);
  }
  // 不能直接回傳訊息：action 設定 cookie 後，Next.js 會在同一個請求內重新渲染目前頁面，
  // 而 auth() 讀的是原始請求的舊 token（版本已不符），會被 layout 導回登入頁。
  // redirect 時 Next.js 會把新 cookie 合併進轉址請求（action-handler.js 的
  // getForwardedHeaders），轉址後的頁面讀得到新 token
  redirect("/profile?passwordChanged=1");
}

async function reissueSession(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return true;
  } catch (error) {
    // 例如 email 驗證在登入後才被開啟而帳號尚未驗證：密碼已更新，只是需要重新登入
    console.error("Failed to re-issue session after password change", error);
    return false;
  }
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
