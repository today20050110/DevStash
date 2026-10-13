"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createCollection,
  type CreateCollectionField,
} from "@/actions/collections";
import {
  errorProps,
  ItemFormField,
} from "@/components/items/ItemFormFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
} from "@/lib/collection-schemas";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

type CollectionFormValues = Record<CreateCollectionField, string>;
type CollectionFormErrors = Partial<Record<CreateCollectionField, string>>;

const EMPTY_VALUES: CollectionFormValues = { name: "", description: "" };

/** 頂部列的 New Collection 按鈕與新增 dialog */
export function NewCollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(EMPTY_VALUES);
  const [errors, setErrors] = useState<CollectionFormErrors>({});
  const [isCreating, startCreating] = useTransition();

  function reset() {
    setValues(EMPTY_VALUES);
    setErrors({});
  }

  function handleOpenChange(next: boolean) {
    // 建立中不讓 Esc／點外面關閉，避免看不到結果
    if (isCreating) {
      return;
    }
    setOpen(next);
    if (!next) {
      reset();
    }
  }

  function setValue(field: CreateCollectionField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startCreating(async () => {
      const result = await callServerAction(() => createCollection(values));
      // 沒連上伺服器：dialog 保持開啟、內容保留，讓使用者重試
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Failed to create collection");
        return;
      }
      toast.success(`Created "${result.data.name}"`);
      setOpen(false);
      reset();
      // collection 卡片、統計與側邊欄都是 server component
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="hidden sm:inline-flex">
          <FolderPlus />
          New Collection
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
          <DialogDescription>
            Group related items under a name.
          </DialogDescription>
        </DialogHeader>

        {/* noValidate：錯誤訊息交給伺服器端的 Zod，一致顯示在欄位下方 */}
        <form noValidate onSubmit={handleSubmit} className="space-y-6">
          <ItemFormField id="collection-name" label="Name" error={errors.name}>
            <Input
              id="collection-name"
              {...errorProps("collection-name", errors.name)}
              value={values.name}
              onChange={(event) => setValue("name", event.target.value)}
              maxLength={COLLECTION_NAME_MAX_LENGTH}
              placeholder="React Patterns"
              required
              autoFocus
            />
          </ItemFormField>
          <ItemFormField
            id="collection-description"
            label="Description"
            error={errors.description}
          >
            <Textarea
              id="collection-description"
              {...errorProps("collection-description", errors.description)}
              value={values.description}
              onChange={(event) => setValue("description", event.target.value)}
              maxLength={COLLECTION_DESCRIPTION_MAX_LENGTH}
              placeholder="Optional"
              rows={3}
            />
          </ItemFormField>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isCreating}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isCreating || values.name.trim() === ""}
            >
              {isCreating ? <Loader2 className="animate-spin" /> : <FolderPlus />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
