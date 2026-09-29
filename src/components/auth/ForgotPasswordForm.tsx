"use client";

import { useActionState, useState } from "react";

import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "@/actions/password-reset";
import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import { Button } from "@/components/ui/button";

interface ForgotPasswordFormProps {
  defaultEmail: string;
}

const INITIAL_STATE: ForgotPasswordState = { success: false };

export function ForgotPasswordForm({ defaultEmail }: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(
    requestPasswordResetAction,
    INITIAL_STATE,
  );
  // 受控欄位：action 結束後 React 會重設表單，email 不該被清掉
  const [email, setEmail] = useState(defaultEmail);

  return (
    <form action={formAction} className="grid gap-4">
      {state.error && <FormMessage variant="error">{state.error}</FormMessage>}
      {state.message && (
        <FormMessage variant="success">{state.message}</FormMessage>
      )}
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
      <Button type="submit" disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
