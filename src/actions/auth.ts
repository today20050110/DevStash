"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/auth.config";
import { EmailNotVerifiedError } from "@/lib/auth-errors";
import { emailSchema, signInSchema } from "@/lib/auth-schemas";
import { resendVerificationEmail } from "@/lib/email-verification";
import { getSafeRedirect } from "@/lib/redirect";

export interface SignInState {
  success: boolean;
  error?: string;
  // 密碼正確但 email 未驗證：表單顯示重寄驗證信的按鈕
  needsVerification?: boolean;
}

export interface ResendVerificationState {
  success: boolean;
  message?: string;
  error?: string;
}

const INVALID_CREDENTIALS = "Invalid email or password";
const EMAIL_NOT_VERIFIED =
  "Please verify your email first. Check your inbox for the verification link.";
const RESEND_SENT =
  "If this account still needs verification, a new link has been sent.";

export async function signInWithCredentials(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    // 成功時 signIn 會丟出 Next.js 的 redirect，必須讓它往上拋
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: getSafeRedirect(formData.get("callbackUrl")),
    });
    return { success: true };
  } catch (error) {
    if (error instanceof EmailNotVerifiedError) {
      return {
        success: false,
        error: EMAIL_NOT_VERIFIED,
        needsVerification: true,
      };
    }
    if (error instanceof AuthError) {
      // 不區分帳號不存在與密碼錯誤
      return {
        success: false,
        error:
          error.type === "CredentialsSignin"
            ? INVALID_CREDENTIALS
            : "Sign in failed, please try again",
      };
    }
    throw error;
  }
}

// 與登入表單共用同一個 form（按鈕的 formAction），只讀 email 欄位
export async function resendVerification(
  _prevState: ResendVerificationState,
  formData: FormData,
): Promise<ResendVerificationState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await resendVerificationEmail(parsed.data);
  } catch (error) {
    // 只有查詢帳號失敗會走到這裡；寄信失敗已在內部處理，對外維持相同訊息
    console.error("Failed to resend verification email", error);
    return {
      success: false,
      error: "Something went wrong, please try again",
    };
  }
  // 無論帳號是否存在都回相同訊息，不透露 email 是否已註冊
  return { success: true, message: RESEND_SENT };
}

export async function signInWithGitHub(formData: FormData) {
  await signIn("github", {
    redirectTo: getSafeRedirect(formData.get("callbackUrl")),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
