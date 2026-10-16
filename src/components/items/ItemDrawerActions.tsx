"use client";

import { Check, Copy, Pencil, Pin } from "lucide-react";

import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { getCopyValue } from "@/lib/item-copy";
import { cn } from "@/lib/utils";
import type { ItemDetail } from "@/types/items";

/** Pin 尚未接上功能，先顯示狀態；以 aria-disabled 而非 disabled，保留啟用時的顏色 */
const NOT_YET_AVAILABLE = {
  "aria-disabled": true,
  title: "Coming soon",
  className: "cursor-not-allowed",
} as const;

interface ItemDrawerActionsProps {
  item: ItemDetail;
  onEdit: () => void;
  onDeleted: () => void;
  /** 收藏切換成功後更新 drawer 內的 item */
  onFavoriteChange: (isFavorite: boolean) => void;
}

export function ItemDrawerActions({
  item,
  onEdit,
  onDeleted,
  onFavoriteChange,
}: ItemDrawerActionsProps) {
  const copyValue = getCopyValue(item);
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex items-center gap-1 border-b px-4 py-2">
      <FavoriteButton
        kind="item"
        id={item.id}
        name={item.title}
        isFavorite={item.isFavorite}
        variant="labeled"
        onSaved={onFavoriteChange}
      />
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
