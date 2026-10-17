"use client";

import type { RefObject } from "react";
import { FolderPlus } from "lucide-react";

import { createCollection } from "@/actions/collections";
import {
  CollectionFormDialog,
  EMPTY_COLLECTION_VALUES,
} from "@/components/collections/CollectionFormDialog";

interface NewCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 關閉後焦點要回到的觸發按鈕 */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/** 新增 collection 的 dialog；開啟的按鈕由 TopbarActions 提供 */
export function NewCollectionDialog({
  open,
  onOpenChange,
  returnFocusRef,
}: NewCollectionDialogProps) {
  return (
    <CollectionFormDialog
      open={open}
      onOpenChange={onOpenChange}
      returnFocusRef={returnFocusRef}
      title="New Collection"
      description="Group related items under a name."
      initialValues={EMPTY_COLLECTION_VALUES}
      submitLabel="Create"
      submitIcon={<FolderPlus />}
      submit={createCollection}
      successMessage={(name) => `Created "${name}"`}
      failureMessage="Failed to create collection"
    />
  );
}
