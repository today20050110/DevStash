"use client";

import { useRef, useState, type MouseEvent } from "react";
import { FolderPlus, Plus } from "lucide-react";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CollectionOption } from "@/types/collections";
import type { CreatableItemType } from "@/types/items";

interface TopbarActionsProps {
  itemTypes: CreatableItemType[];
  collections: CollectionOption[];
}

type DialogKind = "item" | "collection";

/**
 * Top bar 的新增入口：sm 以下合併成一顆「+」選單，sm 以上是兩顆按鈕。
 * 兩種入口開的是同一份 dialog，每個 dialog 只渲染一次
 */
export function TopbarActions({ itemTypes, collections }: TopbarActionsProps) {
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  // 開啟 dialog 的元素；dialogs 沒有 DialogTrigger，關閉時由這裡告訴它焦點要回到哪
  const openerRef = useRef<HTMLElement | null>(null);
  const pendingFromMenu = useRef<DialogKind | null>(null);

  function openFromButton(kind: DialogKind, event: MouseEvent<HTMLElement>) {
    openerRef.current = event.currentTarget;
    setOpenDialog(kind);
  }

  // 選單完全關閉後才開 dialog；在 onSelect 裡直接開，選單關閉時的焦點還原會和 dialog 搶焦點
  function openPendingFromMenu() {
    if (!pendingFromMenu.current) return;
    openerRef.current = createButtonRef.current;
    setOpenDialog(pendingFromMenu.current);
    pendingFromMenu.current = null;
  }

  function handleOpenChange(kind: DialogKind) {
    return (open: boolean) => setOpenDialog(open ? kind : null);
  }

  return (
    <>
      {/* modal={false}：從選單開啟 dialog 時，選單的 modal 狀態不會把 body 的 pointer-events 卡住 */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={createButtonRef}
            size="icon"
            aria-label="Create"
            className="sm:hidden"
          >
            <Plus />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={openPendingFromMenu}>
          <DropdownMenuItem onSelect={() => (pendingFromMenu.current = "item")}>
            <Plus />
            New Item
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => (pendingFromMenu.current = "collection")}
          >
            <FolderPlus />
            New Collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="lg"
        className="hidden sm:inline-flex"
        onClick={(event) => openFromButton("collection", event)}
      >
        <FolderPlus />
        New Collection
      </Button>
      <Button
        size="lg"
        className="hidden sm:inline-flex"
        onClick={(event) => openFromButton("item", event)}
      >
        <Plus />
        New Item
      </Button>

      <NewCollectionDialog
        open={openDialog === "collection"}
        onOpenChange={handleOpenChange("collection")}
        returnFocusRef={openerRef}
      />
      <NewItemDialog
        itemTypes={itemTypes}
        collections={collections}
        open={openDialog === "item"}
        onOpenChange={handleOpenChange("item")}
        returnFocusRef={openerRef}
      />
    </>
  );
}
