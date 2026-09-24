"use client";

import { useActionState, useState } from "react";

import { signInWithCredentials, type SignInState } from "@/actions/auth";
import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import { Button } from "@/components/ui/button";

interface SignInFormProps {
  callbackUrl: string;
  defaultEmail: string;
  // 註冊成功後導回時的提示；一旦出現錯誤就不再顯示
  notice?: string;
  // 由 URL 的 ?error= 帶來的錯誤（例如 GitHub 登入失敗）
  initialError?: string;
}

const INITIAL_STATE: SignInState = { success: false };

export function SignInForm({
  callbackUrl,
  defaultEmail,
  notice,
  initialError,
}: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithCredentials,
    INITIAL_STATE,
  );
  // 受控欄位：action 結束後 React 會重設表單，登入失敗時 email 不該被清掉
  const [email, setEmail] = useState(defaultEmail);
  const error = state.error ?? initialError;

  return (
    <form action={formAction} className="grid gap-4">
      {error ? (
        <FormMessage variant="error">{error}</FormMessage>
      ) : (
        notice && <FormMessage variant="success">{notice}</FormMessage>
      )}
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <FormField
        id="password"
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
