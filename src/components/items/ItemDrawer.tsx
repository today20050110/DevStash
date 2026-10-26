"use client";

import { useState } from "react";

import { TypeIconTile } from "@/components/dashboard/TypeIconTile";
import { ItemDrawerActions } from "@/components/items/ItemDrawerActions";
import { ItemDrawerBody } from "@/components/items/ItemDrawerSections";
import { ItemEditForm } from "@/components/items/ItemEditForm";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useItemDetail, type ItemDetailRequest } from "@/hooks/use-item-detail";
import type { CollectionOption } from "@/types/collections";
import type { ItemDetail } from "@/types/items";

interface ItemDrawerProps {
  request: ItemDetailRequest | null;
  /** 編輯模式可加入的 collections */
  collections: CollectionOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemDrawer({
  request,
  collections,
  open,
  onOpenChange,
}: ItemDrawerProps) {
  const { item, error, isLoading, replaceItem } = useItemDetail(request);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        {item && request ? (
          // key 為每次開啟的 request：重新開啟時一律從檢視模式開始，未儲存的編輯不會殘留
          <ItemDrawerPanel
            key={request.key}
            item={item}
            collections={collections}
            onItemChange={replaceItem}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <SheetHeader className="pr-12">
            {/* Radix 要求 Dialog 一定要有標題；載入中與錯誤時只給螢幕閱讀器 */}
            <SheetTitle className="sr-only">
              {isLoading ? "Loading item" : "Item unavailable"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Item details
            </SheetDescription>
            {isLoading ? (
              <ItemDrawerSkeleton />
            ) : (
              <p role="alert" className="pt-8 text-sm text-destructive">
                {error ?? "Failed to load item"}
              </p>
            )}
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

interface ItemDrawerPanelProps {
  item: ItemDetail;
  collections: CollectionOption[];
  onItemChange: (item: ItemDetail) => void;
  /** 刪除後，或點了 drawer 內換頁的連結（標籤）時關閉 drawer */
  onClose: () => void;
}

/**
 * 檢視與編輯模式的切換；編輯模式下操作列換成 Save／Cancel。
 * 採用 AI 優化的 prompt 時以新內容進入編輯模式，使用者按 Save 才儲存、Cancel 即放棄
 */
function ItemDrawerPanel({
  item,
  collections,
  onItemChange,
  onClose,
}: ItemDrawerPanelProps) {
  // null 為檢視模式；content 有值時以它取代 item 的內容作為表單初始值
  const [editing, setEditing] = useState<{ content?: string } | null>(null);

  function handleSaved(updated: ItemDetail) {
    onItemChange(updated);
    setEditing(null);
  }

  return (
    <>
      <ItemDrawerHeader item={item} />
      {editing ? (
        <ItemEditForm
          item={item}
          initialContent={editing.content}
          collections={collections}
          onCancel={() => setEditing(null)}
          onSaved={handleSaved}
        />
      ) : (
        <>
          <ItemDrawerActions
            item={item}
            onEdit={() => setEditing({})}
            onDeleted={onClose}
            onFavoriteChange={(isFavorite) =>
              onItemChange({ ...item, isFavorite })
            }
            onPinChange={(pinnedAt) => onItemChange({ ...item, pinnedAt })}
          />
          <ItemDrawerBody
            item={item}
            onNavigate={onClose}
            onUseOptimizedPrompt={(content) => setEditing({ content })}
          />
        </>
      )}
    </>
  );
}

function ItemDrawerHeader({ item }: { item: ItemDetail }) {
  const { color, icon, name } = item.type;

  return (
    <SheetHeader className="flex-row items-start gap-3 pr-12">
      <TypeIconTile icon={icon} color={color} />
      <div className="min-w-0 space-y-2">
        <SheetTitle className="text-lg font-semibold break-words">
          {item.title}
        </SheetTitle>
        <SheetDescription className="sr-only">{name} details</SheetDescription>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{name}</Badge>
          {item.language && <Badge variant="outline">{item.language}</Badge>}
        </div>
      </div>
    </SheetHeader>
  );
}

function ItemDrawerSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
