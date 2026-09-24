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
import { getSafeRedirect } from "@/lib/redirect";

export const metadata: Metadata = { title: "Sign in · DevStash" };

// Auth.js 以 ?error= 導回登入頁時的錯誤代碼
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  // 不自動連結帳號：同 email 已用帳號密碼註冊時，GitHub 登入會被拒絕
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with your email and password instead.",
};
const DEFAULT_ERROR = "Sign in failed, please try again";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const params = await searchParams;
  const callbackUrl = getSafeRedirect(firstParam(params.callbackUrl));

  if (await getCurrentUser()) {
    redirect(callbackUrl);
  }

  const errorCode = firstParam(params.error);
  const initialError = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? DEFAULT_ERROR)
    : undefined;
  const registered = firstParam(params.registered) === "1";

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
          notice={registered ? "Account created. Please sign in." : undefined}
          initialError={initialError}
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
