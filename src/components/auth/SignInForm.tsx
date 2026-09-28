"use client";

import { useActionState, useState } from "react";

import {
  resendVerification,
  signInWithCredentials,
  type ResendVerificationState,
  type SignInState,
} from "@/actions/auth";
import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import { Button } from "@/components/ui/button";

interface SignInFormProps {
  callbackUrl: string;
  defaultEmail: string;
  // 註冊或驗證成功後導回時的提示；一旦出現錯誤就不再顯示
  notice?: string;
  // 由 URL 的 ?error= 帶來的錯誤（例如 GitHub 登入失敗、驗證連結過期）
  initialError?: string;
  // 由 URL 判斷一開始就要顯示重寄驗證信的按鈕（剛註冊、驗證連結無效）
  initialNeedsVerification?: boolean;
}

const INITIAL_STATE: SignInState = { success: false };
const INITIAL_RESEND_STATE: ResendVerificationState = { success: false };

export function SignInForm({
  callbackUrl,
  defaultEmail,
  notice,
  initialError,
  initialNeedsVerification = false,
}: SignInFormProps) {
  const [state, formAction, isPending] = useActionState(
    signInWithCredentials,
    INITIAL_STATE,
  );
  const [resendState, resendAction, isResending] = useActionState(
    resendVerification,
    INITIAL_RESEND_STATE,
  );
  // 受控欄位：action 結束後 React 會重設表單，登入失敗時 email 不該被清掉
  const [email, setEmail] = useState(defaultEmail);
  const error = state.error ?? initialError;
  // 送出過登入後以結果為準，否則沿用 URL 帶來的狀態
  const needsVerification =
    state === INITIAL_STATE
      ? initialNeedsVerification
      : Boolean(state.needsVerification);

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
      {needsVerification && (
        <div className="grid gap-2">
          {/* 共用同一個 form，只取 email；formNoValidate 讓空密碼也能送出 */}
          <Button
            type="submit"
            variant="outline"
            formAction={resendAction}
            formNoValidate
            disabled={isResending}
          >
            {isResending ? "Sending…" : "Resend verification email"}
          </Button>
          {resendState.message && (
            <FormMessage variant="success">{resendState.message}</FormMessage>
          )}
          {resendState.error && (
            <FormMessage variant="error">{resendState.error}</FormMessage>
          )}
        </div>
      )}
    </form>
  );
}
