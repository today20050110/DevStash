import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
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
import { firstParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Forgot password · DevStash" };

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  if (await getCurrentUser()) {
    redirect(DEFAULT_REDIRECT);
  }
  const params = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Forgot password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm defaultEmail={firstParam(params.email) ?? ""} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Remember your password?
        <Link href="/sign-in" className="ml-1 text-foreground underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
