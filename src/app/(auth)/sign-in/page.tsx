import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { SignInForm } from "@/components/auth/SignInForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/current-user";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { getSafeRedirect } from "@/lib/redirect";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Sign in · DevStash" };

// Auth.js 以 ?error= 導回登入頁時的錯誤代碼
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  // 不自動連結帳號：同 email 已用帳號密碼註冊時，GitHub 登入會被拒絕
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with your email and password instead.",
  // 由 /api/auth/verify-email 導回
  VerificationExpired:
    "This verification link has expired. Request a new one below.",
  VerificationInvalid:
    "This verification link is invalid or has already been used.",
};
const VERIFICATION_ERRORS = new Set([
  "VerificationExpired",
  "VerificationInvalid",
]);
const DEFAULT_ERROR = "Sign in failed, please try again";
const EMAIL_NOT_SENT =
  "Account created, but we couldn't send the verification email. Use the button below to resend it.";

function getNotice(params: {
  registered: boolean;
  verified: boolean;
  passwordReset: boolean;
  verificationEnabled: boolean;
}) {
  if (params.passwordReset) {
    return "Password updated. You can now sign in.";
  }
  if (params.verified) {
    return "Email verified. You can now sign in.";
  }
  if (params.registered) {
    return params.verificationEnabled
      ? "Account created. Check your inbox for a verification link."
      : "Account created. You can now sign in.";
  }
  return undefined;
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const callbackUrl = getSafeRedirect(firstParam(params.callbackUrl));

  if (await getCurrentUser()) {
    redirect(callbackUrl);
  }

  const verificationEnabled = isEmailVerificationEnabled();
  const rawErrorCode = firstParam(params.error);
  const isVerificationError =
    rawErrorCode !== undefined && VERIFICATION_ERRORS.has(rawErrorCode);
  // 關閉驗證時不必處理舊連結失效：未驗證也能直接登入，提示重寄反而誤導
  const errorCode =
    isVerificationError && !verificationEnabled ? undefined : rawErrorCode;
  const registered = firstParam(params.registered) === "1";
  const verified = firstParam(params.verified) === "1";
  const passwordReset = firstParam(params.reset) === "1";
  // 註冊 API 回報驗證信寄送失敗
  const emailNotSent =
    verificationEnabled && registered && firstParam(params.sent) === "0";
  const initialError = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? DEFAULT_ERROR)
    : emailNotSent
      ? EMAIL_NOT_SENT
      : undefined;
  const initialNeedsVerification =
    verificationEnabled && (registered || isVerificationError);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Welcome back to DevStash</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <SignInForm
          callbackUrl={callbackUrl}
          defaultEmail={firstParam(params.email) ?? ""}
          notice={getNotice({
            registered,
            verified,
            passwordReset,
            verificationEnabled,
          })}
          initialError={initialError}
          initialNeedsVerification={initialNeedsVerification}
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <GitHubSignInButton callbackUrl={callbackUrl} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Don&apos;t have an account?
        <Link href="/register" className="ml-1 text-foreground underline">
          Register
        </Link>
      </CardFooter>
    </Card>
  );
}
