"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/auth.config";
import { signInSchema } from "@/lib/auth-schemas";
import { getSafeRedirect } from "@/lib/redirect";

export interface SignInState {
  success: boolean;
  error?: string;
}

const INVALID_CREDENTIALS = "Invalid email or password";

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

export async function signInWithGitHub(formData: FormData) {
  await signIn("github", {
    redirectTo: getSafeRedirect(formData.get("callbackUrl")),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: SIGN_IN_PATH });
}
