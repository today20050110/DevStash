"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  deleteAccountAction,
  type DeleteAccountState,
} from "@/actions/profile";
import { FormField } from "@/components/auth/FormField";
import { FormMessage } from "@/components/auth/FormMessage";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const INITIAL_STATE: DeleteAccountState = { success: false };

interface DeleteAccountDialogProps {
  email: string;
}

export function DeleteAccountDialog({ email }: DeleteAccountDialogProps) {
  const [state, formAction, isPending] = useActionState(
    deleteAccountAction,
    INITIAL_STATE,
  );
  const [confirmEmail, setConfirmEmail] = useState("");
  // 與伺服器端相同的比對（trim + 不分大小寫）；伺服器端仍會再驗證一次
  const matches = confirmEmail.trim().toLowerCase() === email.toLowerCase();

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          setConfirmEmail("");
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-fit">
          <Trash2 />
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* 不用 AlertDialogAction：它點擊後會關閉對話框，看不到伺服器回傳的錯誤 */}
        <form action={formAction} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and all of your items,
              collections and tags. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {state.error && (
            <FormMessage variant="error">{state.error}</FormMessage>
          )}
          <FormField
            id="confirmEmail"
            name="confirmEmail"
            label={`Type ${email} to confirm`}
            type="email"
            autoComplete="off"
            required
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={!matches || isPending}
            >
              {isPending ? "Deleting…" : "Delete account"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
