"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";

import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CollectionHeader } from "@/types/collections";

/** 收藏切換尚未實作；按鈕先停用，提示之後會提供 */
export const FAVORITE_COMING_SOON = "Favorites are coming soon";

/** /collections/[id] 頁首的 Favorite、Edit、Delete */
export function CollectionActions({
  collection,
}: {
  collection: CollectionHeader;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDeleted() {
    // 這一頁已不存在；側邊欄在 layout 裡，換頁不會重新取得，所以另外 refresh
    router.replace("/collections");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* 停用的按鈕收不到滑鼠事件，title 放在外層才看得到提示 */}
      <span title={FAVORITE_COMING_SOON}>
        <Button variant="ghost" size="sm" disabled>
          <Star
            className={cn(
              collection.isFavorite && "fill-yellow-400 text-yellow-400",
            )}
          />
          {collection.isFavorite ? "Favorited" : "Favorite"}
        </Button>
      </span>
      <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil />
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 />
        Delete
      </Button>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
