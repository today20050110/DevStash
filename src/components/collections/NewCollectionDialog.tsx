"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";

import { createCollection } from "@/actions/collections";
import {
  CollectionFormDialog,
  EMPTY_COLLECTION_VALUES,
} from "@/components/collections/CollectionFormDialog";
import { Button } from "@/components/ui/button";

/** 頂部列的 New Collection 按鈕與新增 dialog */
export function NewCollectionDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="hidden sm:inline-flex"
        onClick={() => setOpen(true)}
      >
        <FolderPlus />
        New Collection
      </Button>
      <CollectionFormDialog
        open={open}
        onOpenChange={setOpen}
        title="New Collection"
        description="Group related items under a name."
        initialValues={EMPTY_COLLECTION_VALUES}
        submitLabel="Create"
        submitIcon={<FolderPlus />}
        submit={createCollection}
        successMessage={(name) => `Created "${name}"`}
        failureMessage="Failed to create collection"
      />
    </>
  );
}
