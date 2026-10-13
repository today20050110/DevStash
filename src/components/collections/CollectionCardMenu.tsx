"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";

import { FAVORITE_COMING_SOON } from "@/components/collections/CollectionActions";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CollectionHeader } from "@/types/collections";

/**
 * collection 卡片右上角的「⋯」選單。卡片整張是連結的覆蓋層，這裡以 relative z-10
 * 疊在上面，點按鈕與選單才不會變成進入 collection 頁
 */
export function CollectionCardMenu({
  collection,
}: {
  collection: CollectionHeader;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      {/* modal={false}：從選單開啟 dialog 時，選單的 modal 狀態不會把 body 的 pointer-events 卡住 */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative z-10 -mt-1 -mr-2 text-muted-foreground"
          >
            <MoreHorizontal />
            <span className="sr-only">Actions for {collection.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          {/* 停用的項目收不到滑鼠事件，title 不會出現；直接標示，螢幕閱讀器念完整說明 */}
          <DropdownMenuItem disabled aria-label={FAVORITE_COMING_SOON}>
            <Star />
            {collection.isFavorite ? "Unfavorite" : "Favorite"}
            <span className="ml-auto text-xs text-muted-foreground">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        // 卡片、統計數字與側邊欄都由 server component 渲染
        onDeleted={() => router.refresh()}
      />
    </>
  );
}
