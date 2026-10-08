"use client";

import { Check, Copy, Pencil, Pin, Star } from "lucide-react";

import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types/items";

/** Favorite、Pin 尚未接上功能，先顯示狀態；以 aria-disabled 而非 disabled，保留啟用時的顏色 */
const NOT_YET_AVAILABLE = {
  "aria-disabled": true,
  title: "Coming soon",
  className: "cursor-not-allowed",
} as const;

interface ItemDrawerActionsProps {
  item: ItemDetail;
  onEdit: () => void;
  onDeleted: () => void;
}

export function ItemDrawerActions({
  item,
  onEdit,
  onDeleted,
}: ItemDrawerActionsProps) {
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
        <DeleteItemDialog
          itemId={item.id}
          title={item.title}
          onDeleted={onDeleted}
        />
      </div>
    </div>
  );
}
