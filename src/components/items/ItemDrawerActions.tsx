"use client";

import { Check, Copy, Pencil } from "lucide-react";

import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { PinButton } from "@/components/items/PinButton";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { getCopyValue } from "@/lib/item-copy";
import type { ItemDetail } from "@/types/items";

interface ItemDrawerActionsProps {
  item: ItemDetail;
  onEdit: () => void;
  onDeleted: () => void;
  /** 收藏切換成功後更新 drawer 內的 item */
  onFavoriteChange: (isFavorite: boolean) => void;
  /** 釘選切換成功後更新 drawer 內的 item */
  onPinChange: (pinnedAt: Date | null) => void;
}

export function ItemDrawerActions({
  item,
  onEdit,
  onDeleted,
  onFavoriteChange,
  onPinChange,
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
      <PinButton
        itemId={item.id}
        isPinned={item.pinnedAt !== null}
        onSaved={onPinChange}
      />
      <Button
        variant="ghost"
        size="sm"
        disabled={!copyValue}
        onClick={() => copyValue && copy(copyValue)}
        className="relative pointer-coarse:hit-area"
      >
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy"}
      </Button>

      {/* 觸控裝置上刪除鈕的點擊範圍會往左擴大，間距加大以免蓋到 Edit */}
      <div className="ml-auto flex items-center gap-1 pointer-coarse:gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="relative pointer-coarse:hit-area"
        >
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
