"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { SIGN_IN_PATH } from "@/auth.config";
import { emailSchema, resetPasswordSchema } from "@/lib/auth-schemas";
import {
  RESET_LINK_ERRORS,
  type ResetPasswordResult,
  requestPasswordReset,
  resetPassword,
} from "@/lib/password-reset";
import {
  checkRateLimit,
  getActionClientIp,
  rateLimitMessage,
} from "@/lib/rate-limit";

export interface ForgotPasswordState {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ResetPasswordState {
  success: boolean;
  error?: string;
  fieldErrors?: { password?: string; confirmPassword?: string };
  // 連結失效：表單改為顯示重新申請的連結
  linkInvalid?: boolean;
}

const RESET_REQUESTED =
  "If an account with a password exists for this email, a reset link has been sent.";
const GENERIC_ERROR = "Something went wrong, please try again";

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // 每次申請都可能寄信：擋下拿來轟炸別人信箱的請求
  const ip = await getActionClientIp();
  const limit = await checkRateLimit("forgotPassword", ip);
  if (!limit.success) {
    return { success: false, error: rateLimitMessage(limit.reset) };
  }

  try {
    await requestPasswordReset(parsed.data);
  } catch (error) {
    // 寄信失敗已在內部處理，這裡只會是資料庫錯誤
    console.error("Failed to request password reset", error);
    return { success: false, error: GENERIC_ERROR };
  }
  // 無論帳號是否存在都回相同訊息，不透露 email 是否已註冊
  return { success: true, message: RESET_REQUESTED };
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  // 放在驗證格式之前：拿亂碼 token 反覆嘗試的請求也要計入
  const ip = await getActionClientIp();
  const limit = await checkRateLimit("resetPassword", ip);
  if (!limit.success) {
    return { success: false, error: rateLimitMessage(limit.reset) };
  }

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    if (fieldErrors.email || fieldErrors.token) {
      return {
        success: false,
        error: RESET_LINK_ERRORS.invalid,
        linkInvalid: true,
      };
    }
    return {
      success: false,
      fieldErrors: {
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const { email, token, password } = parsed.data;
  let result: ResetPasswordResult;
  try {
    result = await resetPassword(email, token, password);
  } catch (error) {
    console.error("Failed to reset password", error);
    return { success: false, error: GENERIC_ERROR };
  }
  if (result !== "reset") {
    return {
      success: false,
      error: RESET_LINK_ERRORS[result],
      linkInvalid: true,
    };
  }

  // redirect 會丟出例外，放在 try/catch 之外
  const params = new URLSearchParams({ reset: "1", email });
  redirect(`${SIGN_IN_PATH}?${params}`);
}
