"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { createItem, type CreateItemField } from "@/actions/items";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { FileUpload, type UploadedFile } from "@/components/items/FileUpload";
import {
  EMPTY_ITEM_FORM_VALUES,
  ItemFormFields,
  type ItemFormValues,
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
import { getUploadCategory } from "@/lib/file-types";
import { getItemTypeFields } from "@/lib/item-fields";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";
import { cn } from "@/lib/utils";
import { parseTagInput } from "@/lib/tags";
import type { CreatableItemType } from "@/types/items";

interface NewItemDialogProps {
  /** 可新增的型別（方案不能上傳時不含 FILE kind），第一個為預設 */
  itemTypes: CreatableItemType[];
}

type CreateErrors = Partial<Record<CreateItemField, string>>;

/** 頂部列的 New Item 按鈕與新增 dialog；欄位依選擇的型別顯示 */
export function NewItemDialog({ itemTypes }: NewItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typeId, setTypeId] = useState(itemTypes[0]?.id ?? "");
  const [values, setValues] = useState(EMPTY_ITEM_FORM_VALUES);
  const [errors, setErrors] = useState<CreateErrors>({});
  const [upload, setUpload] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, startCreating] = useTransition();

  const selectedType = itemTypes.find((type) => type.id === typeId);
  const fields = selectedType
    ? getItemTypeFields(selectedType)
    : {
        content: false,
        language: false,
        markdown: false,
        url: false,
        file: false,
      };
  const uploadCategory =
    fields.file && selectedType ? getUploadCategory(selectedType.slug) : null;
  const canSubmit =
    selectedType !== undefined &&
    values.title.trim() !== "" &&
    !(fields.url && values.url.trim() === "") &&
    !(fields.file && (upload === null || isUploading));

  function reset() {
    setTypeId(itemTypes[0]?.id ?? "");
    setValues(EMPTY_ITEM_FORM_VALUES);
    setErrors({});
    setUpload(null);
  }

  function handleOpenChange(next: boolean) {
    // 建立中不讓 Esc／點外面關閉，避免看不到結果；上傳中關閉會中止上傳
    if (isCreating) {
      return;
    }
    setOpen(next);
    if (!next) {
      reset();
    }
  }

  function handleUploadChange(file: UploadedFile | null) {
    setUpload(file);
    setErrors((previous) => ({ ...previous, file: undefined }));
    // 標題還沒填時以檔名（去掉副檔名）預填
    if (file && values.title.trim() === "") {
      setValue("title", file.fileName.replace(/\.[^.]+$/, ""));
    }
  }

  function setValue(field: keyof ItemFormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function selectType(id: string) {
    setTypeId(id);
    // 上一個型別的欄位錯誤可能屬於現在看不到的欄位
    setErrors({});
    // 圖片與檔案的白名單不同；已上傳的檔案只屬於原本的型別
    setUpload(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startCreating(async () => {
      const result = await callServerAction(() =>
        createItem({
          itemTypeId: typeId,
          ...values,
          tags: parseTagInput(values.tags),
          storageKey: fields.file ? upload?.storageKey : undefined,
          fileName: fields.file ? upload?.fileName : undefined,
        }),
      );
      // 沒連上伺服器：dialog 保持開啟、內容保留，讓使用者重試
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Failed to create item");
        return;
      }
      toast.success(`Created "${result.data.title}"`);
      setOpen(false);
      reset();
      // 卡片列表、統計與側邊欄數量都是 server component
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus />
          New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>
            Choose a type, then fill in the details.
          </DialogDescription>
        </DialogHeader>

        {/* noValidate：URL 等格式交給伺服器端的 Zod，錯誤訊息一致顯示在欄位下方 */}
        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="-mx-4 min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-1">
            <TypeSelector
              itemTypes={itemTypes}
              value={typeId}
              onChange={selectType}
              error={errors.itemTypeId}
            />
            {uploadCategory && selectedType && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {uploadCategory === "image" ? "Image" : "File"}
                </h3>
                <FileUpload
                  // 換型別時重新掛載，進行中的上傳一併中止
                  key={selectedType.id}
                  category={uploadCategory}
                  itemTypeId={selectedType.id}
                  value={upload}
                  onChange={handleUploadChange}
                  onUploadingChange={setIsUploading}
                  error={errors.file}
                />
              </section>
            )}
            <ItemFormFields
              fields={fields}
              values={values}
              errors={errors}
              typeSlug={selectedType?.slug ?? ""}
              setValue={setValue}
              urlRequired
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isCreating}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isCreating || !canSubmit}>
              {isCreating ? <Loader2 className="animate-spin" /> : <Plus />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TypeSelectorProps {
  itemTypes: CreatableItemType[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

/** 原生 radio：方向鍵切換與表單語意由瀏覽器處理 */
function TypeSelector({
  itemTypes,
  value,
  onChange,
  error,
}: TypeSelectorProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium text-muted-foreground">
        Type
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {itemTypes.map((type) => (
          <label
            key={type.id}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border px-2 py-3 text-xs transition-colors hover:bg-muted",
              "has-checked:border-ring has-checked:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            )}
          >
            <input
              type="radio"
              name="item-type"
              value={type.id}
              checked={value === type.id}
              onChange={() => onChange(type.id)}
              className="sr-only"
            />
            {/* 型別色由資料決定，無法寫成固定的 Tailwind class */}
            <TypeIcon
              name={type.icon}
              className="size-4"
              style={{ color: type.color }}
              aria-hidden
            />
            <span className="truncate">{type.name}</span>
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
