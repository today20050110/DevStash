"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Pencil, Pin, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types/items";

const COPIED_RESET_MS = 2000;

/** Favorite、Pin、Delete 尚未接上功能，先顯示狀態；以 aria-disabled 而非 disabled，保留啟用時的顏色 */
const NOT_YET_AVAILABLE = {
  "aria-disabled": true,
  title: "Coming soon",
  className: "cursor-not-allowed",
} as const;

interface ItemDrawerActionsProps {
  item: ItemDetail;
  onEdit: () => void;
}

export function ItemDrawerActions({ item, onEdit }: ItemDrawerActionsProps) {
  const copyValue = item.type.kind === "URL" ? item.url : item.content;
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex items-center gap-1 border-b px-4 py-2">
      <Button variant="ghost" size="sm" {...NOT_YET_AVAILABLE}>
        <Star
          className={cn(item.isFavorite && "fill-yellow-400 text-yellow-400")}
        />
        <span className={cn(item.isFavorite && "text-yellow-400")}>
          Favorite
        </span>
      </Button>
      <Button variant="ghost" size="sm" {...NOT_YET_AVAILABLE}>
        <Pin className={cn(item.pinnedAt && "fill-current")} />
        {item.pinnedAt ? "Pinned" : "Pin"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!copyValue}
        onClick={() => copyValue && copy(copyValue)}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          {...NOT_YET_AVAILABLE}
          className="cursor-not-allowed text-destructive hover:text-destructive"
        >
          <Trash2 />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非安全來源或使用者拒絕權限時寫入失敗，不顯示「Copied」
      return;
    }
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return { copied, copy };
}
