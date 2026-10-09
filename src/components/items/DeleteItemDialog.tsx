"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteItem } from "@/actions/items";
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
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

interface DeleteItemDialogProps {
  itemId: string;
  title: string;
  /** 刪除成功後呼叫，drawer 據此關閉 */
  onDeleted: () => void;
}

export function DeleteItemDialog({
  itemId,
  title,
  onDeleted,
}: DeleteItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  function handleOpenChange(next: boolean) {
    // 刪除進行中不讓 Esc 或點外面關閉，避免使用者以為已取消
    if (isDeleting) {
      return;
    }
    setOpen(next);
    if (!next) {
      setError(null);
    }
  }

  function handleDelete() {
    startDeleting(async () => {
      const result = await callServerAction(() => deleteItem(itemId));
      if (!result?.success) {
        setError(
          result
            ? (result.error ?? "Failed to delete item")
            : SERVER_UNREACHABLE_MESSAGE,
        );
        return;
      }
      setOpen(false);
      onDeleted();
      toast.success(`Deleted "${title}"`);
      // 卡片、統計數字與側邊欄數量都由 server component 渲染
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{title}&rdquo; will be removed from your items, collections
            and search results.
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
