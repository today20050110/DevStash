"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Button } from "@/components/ui/button";
import type { CollectionHeader } from "@/types/collections";

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
      <FavoriteButton
        kind="collection"
        id={collection.id}
        name={collection.name}
        isFavorite={collection.isFavorite}
        variant="labeled"
      />
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
