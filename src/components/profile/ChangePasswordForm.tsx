"use client";

import { useActionState } from "react";

import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/actions/profile";
import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: ChangePasswordState = { success: false };

interface ChangePasswordFormProps {
  // 讓密碼管理器把新密碼存到這個帳號
  email: string;
  // 成功後 action 以 redirect 回到 /profile?passwordChanged=1，由頁面傳入
  passwordChanged: boolean;
}

export function ChangePasswordForm({
  email,
  passwordChanged,
}: ChangePasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    INITIAL_STATE,
  );
  // 再次送出後以該次結果為準
  const showSuccess = passwordChanged && state === INITIAL_STATE;

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}
      {showSuccess && (
        <FormMessage variant="success">
          Password updated. You&apos;ve been signed out on other devices.
        </FormMessage>
      )}
      <input
        type="email"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />
      <FormField
        id="currentPassword"
        name="currentPassword"
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.currentPassword}
      />
      <FormField
        id="newPassword"
        name="newPassword"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.newPassword}
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
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
