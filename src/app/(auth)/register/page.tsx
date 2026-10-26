import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { GitHubSignInButton } from "@/components/auth/GitHubSignInButton";
import { RegisterForm } from "@/components/auth/RegisterForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/current-user";
import { DEFAULT_REDIRECT } from "@/lib/redirect";

export const metadata: Metadata = { title: "Register · DevStash" };

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect(DEFAULT_REDIRECT);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>
          Start stashing your snippets and notes
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <RegisterForm />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        {/* GitHub 首次登入即建立帳號；同 email 已用密碼註冊時會被拒絕，與登入頁相同 */}
        <GitHubSignInButton
          callbackUrl={DEFAULT_REDIRECT}
          label="Sign up with GitHub"
        />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Already have an account?
        <Link href="/sign-in" className="ml-1 text-foreground underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
