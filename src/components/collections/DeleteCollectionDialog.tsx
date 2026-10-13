"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCollection } from "@/actions/collections";
import { FormMessage } from "@/components/auth/FormMessage";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

interface DeleteCollectionDialogProps {
  collection: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 刪除成功後呼叫：卡片上只要重新整理，詳細頁要導回 /collections */
  onDeleted: () => void;
}

export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  onDeleted,
}: DeleteCollectionDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  function handleOpenChange(next: boolean) {
    // 刪除進行中不讓 Esc 或點外面關閉，避免使用者以為已取消
    if (isDeleting) {
      return;
    }
    onOpenChange(next);
    if (!next) {
      setError(null);
    }
  }

  function handleDelete() {
    startDeleting(async () => {
      const result = await callServerAction(() =>
        deleteCollection(collection.id),
      );
      if (!result?.success) {
        setError(
          result
            ? (result.error ?? "Failed to delete collection")
            : SERVER_UNREACHABLE_MESSAGE,
        );
        return;
      }
      onOpenChange(false);
      toast.success(`Deleted "${collection.name}"`);
      onDeleted();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{collection.name}&rdquo; will be deleted. The items in it are
            kept and stay in your other collections.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FormMessage variant="error">{error}</FormMessage>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          {/* 不用 AlertDialogAction：它點擊後會立即關閉對話框，看不到伺服器回傳的錯誤 */}
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
