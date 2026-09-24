import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
      <CardContent>
        <RegisterForm />
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
