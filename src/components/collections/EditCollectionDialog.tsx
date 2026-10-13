"use client";

import { Save } from "lucide-react";

import { updateCollection } from "@/actions/collections";
import { CollectionFormDialog } from "@/components/collections/CollectionFormDialog";
import type { CollectionHeader } from "@/types/collections";

interface EditCollectionDialogProps {
  collection: CollectionHeader;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
}: EditCollectionDialogProps) {
  return (
    <CollectionFormDialog
      // 存檔後 router.refresh() 帶回新的值；以它們為 key 重新掛載，下次開啟才不會是舊內容
      key={`${collection.name}\n${collection.description ?? ""}`}
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Collection"
      description="Update the name and description."
      initialValues={{
        name: collection.name,
        description: collection.description ?? "",
      }}
      submitLabel="Save"
      submitIcon={<Save />}
      submit={(values) => updateCollection(collection.id, values)}
      successMessage={() => "Collection saved"}
      failureMessage="Failed to save collection"
    />
  );
}
