"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  resetPasswordAction,
  type ResetPasswordState,
} from "@/actions/password-reset";
import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import { Button } from "@/components/ui/button";
import { withEmailParam } from "@/lib/search-params";

interface ResetPasswordFormProps {
  email: string;
  token: string;
}

const INITIAL_STATE: ResetPasswordState = { success: false };

export function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction,
    INITIAL_STATE,
  );

  // 送出時才發現連結失效（例如在另一個分頁已使用過）：不再顯示表單
  if (state.linkInvalid) {
    return <ResetLinkError email={email} message={state.error} />;
  }

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}
      {/* autoComplete="username" 讓密碼管理器把新密碼存到這個帳號 */}
      <input
        type="email"
        name="email"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />
      <input type="hidden" name="token" value={token} />
      <FormField
        id="password"
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.password}
      />
      <FormField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

interface ResetLinkErrorProps {
  email: string;
  message?: string;
}

export function ResetLinkError({ email, message }: ResetLinkErrorProps) {
  const href = withEmailParam("/forgot-password", email);
  return (
    <div className="grid gap-4">
      <FormMessage variant="error">{message}</FormMessage>
      <Button asChild variant="outline">
        <Link href={href}>Request a new reset link</Link>
      </Button>
    </div>
  );
}
