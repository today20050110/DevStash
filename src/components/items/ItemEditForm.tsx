"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import { updateItem, type UpdateItemField } from "@/actions/items";
import {
  CollectionsSection,
  DetailsSection,
} from "@/components/items/ItemDrawerSections";
import {
  ItemFormFields,
  type ItemFormErrors,
  type ItemFormValues,
} from "@/components/items/ItemFormFields";
import { Button } from "@/components/ui/button";
import { getItemTypeFields } from "@/lib/item-fields";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";
import { parseTagInput } from "@/lib/tags";
import type { ItemDetail } from "@/types/items";

interface ItemEditFormProps {
  item: ItemDetail;
  onCancel: () => void;
  onSaved: (item: ItemDetail) => void;
}

function initialValues(item: ItemDetail): ItemFormValues {
  return {
    title: item.title,
    description: item.description ?? "",
    content: item.content ?? "",
    language: item.language ?? "",
    url: item.url ?? "",
    tags: item.tags.join(", "),
  };
}

/** 受控輸入 + local state；伺服器端的 Zod 驗證才是最終依據，這裡只擋空白標題 */
export function ItemEditForm({ item, onCancel, onSaved }: ItemEditFormProps) {
  const router = useRouter();
  const fields = getItemTypeFields(item.type);
  const [values, setValues] = useState(() => initialValues(item));
  const [errors, setErrors] = useState<ItemFormErrors>({});
  const [isSaving, startSaving] = useTransition();

  function setValue(field: UpdateItemField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await callServerAction(() =>
        updateItem(item.id, {
          ...values,
          tags: parseTagInput(values.tags),
        }),
      );
      // 沒連上伺服器：保留表單內容讓使用者重試
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Failed to save item");
        return;
      }
      toast.success("Item saved");
      onSaved(result.data);
      // 底下的卡片列表是 server component，重新取得才會反映新的標題與標籤
      router.refresh();
    });
  }

  return (
    // noValidate：URL 等格式交給伺服器端的 Zod，錯誤訊息一致顯示在欄位下方
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center justify-end gap-1 border-b px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X />
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSaving || values.title.trim() === ""}
        >
          {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
          Save
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        <ItemFormFields
          fields={fields}
          values={values}
          errors={errors}
          typeSlug={item.type.slug}
          setValue={setValue}
        />

        <CollectionsSection item={item} />
        <DetailsSection item={item} />
      </div>
    </form>
  );
}
