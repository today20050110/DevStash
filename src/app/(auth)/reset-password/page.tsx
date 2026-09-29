import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ResetLinkError,
  ResetPasswordForm,
} from "@/components/auth/ResetPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { emailSchema } from "@/lib/auth-schemas";
import { getCurrentUser } from "@/lib/current-user";
import { getResetTokenStatus, RESET_LINK_ERRORS } from "@/lib/password-reset";
import { DEFAULT_REDIRECT } from "@/lib/redirect";
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Reset password · DevStash" };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  if (await getCurrentUser()) {
    redirect(DEFAULT_REDIRECT);
  }
  const params = await searchParams;
  const parsedEmail = emailSchema.safeParse(firstParam(params.email));
  const email = parsedEmail.success ? parsedEmail.data : "";
  const token = firstParam(params.token) ?? "";

  // 只檢查不消耗：token 在送出新密碼時才會被刪除
  const status =
    email && token ? await getResetTokenStatus(email, token) : "invalid";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          {status === "valid"
            ? `Choose a new password for ${email}`
            : "This link can no longer be used"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "valid" ? (
          <ResetPasswordForm email={email} token={token} />
        ) : (
          <ResetLinkError email={email} message={RESET_LINK_ERRORS[status]} />
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="text-foreground underline">
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
