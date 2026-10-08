"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

import { updateItem, type UpdateItemField } from "@/actions/items";
import {
  CollectionsSection,
  DetailsSection,
  Section,
} from "@/components/items/ItemDrawerSections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getItemTypeFields } from "@/lib/item-fields";
import { parseTagInput } from "@/lib/tags";
import type { ItemDetail } from "@/types/items";

interface ItemEditFormProps {
  item: ItemDetail;
  onCancel: () => void;
  onSaved: (item: ItemDetail) => void;
}

type FormValues = Record<UpdateItemField, string>;
type FieldErrors = Partial<Record<UpdateItemField, string>>;

function initialValues(item: ItemDetail): FormValues {
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();

  function setValue(field: UpdateItemField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await updateItem(item.id, {
        ...values,
        tags: parseTagInput(values.tags),
      });
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
        <EditField id="item-title" label="Title" error={errors.title}>
          <Input
            id="item-title"
            {...errorProps("item-title", errors.title)}
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
            required
            autoFocus
          />
        </EditField>
        <EditField
          id="item-description"
          label="Description"
          error={errors.description}
        >
          <Textarea
            id="item-description"
            {...errorProps("item-description", errors.description)}
            value={values.description}
            onChange={(event) => setValue("description", event.target.value)}
            rows={2}
          />
        </EditField>
        <TypeSpecificFields
          fields={fields}
          values={values}
          errors={errors}
          setValue={setValue}
        />
        <EditField id="item-tags" label="Tags" error={errors.tags}>
          <Input
            id="item-tags"
            {...errorProps("item-tags", errors.tags)}
            value={values.tags}
            onChange={(event) => setValue("tags", event.target.value)}
            placeholder="react, hooks, auth"
          />
        </EditField>

        <CollectionsSection item={item} />
        <DetailsSection item={item} />
      </div>
    </form>
  );
}

interface TypeSpecificFieldsProps {
  fields: ReturnType<typeof getItemTypeFields>;
  values: FormValues;
  errors: FieldErrors;
  setValue: (field: UpdateItemField, value: string) => void;
}

/** 只顯示該型別適用的欄位；伺服器端以同一個 getItemTypeFields 忽略其他欄位 */
function TypeSpecificFields({
  fields,
  values,
  errors,
  setValue,
}: TypeSpecificFieldsProps) {
  return (
    <>
      {fields.content && (
        <EditField id="item-content" label="Content" error={errors.content}>
          <Textarea
            id="item-content"
            {...errorProps("item-content", errors.content)}
            value={values.content}
            onChange={(event) => setValue("content", event.target.value)}
            spellCheck={false}
            className="max-h-[50vh] min-h-40 font-mono text-xs md:text-xs"
          />
        </EditField>
      )}
      {fields.language && (
        <EditField id="item-language" label="Language" error={errors.language}>
          <Input
            id="item-language"
            {...errorProps("item-language", errors.language)}
            value={values.language}
            onChange={(event) => setValue("language", event.target.value)}
            placeholder="typescript"
          />
        </EditField>
      )}
      {fields.url && (
        <EditField id="item-url" label="URL" error={errors.url}>
          <Input
            id="item-url"
            {...errorProps("item-url", errors.url)}
            type="url"
            value={values.url}
            onChange={(event) => setValue("url", event.target.value)}
            placeholder="https://"
          />
        </EditField>
      )}
    </>
  );
}

interface EditFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

function EditField({ id, label, error, children }: EditFieldProps) {
  return (
    <Section title={label} htmlFor={id}>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Section>
  );
}

function errorProps(id: string, error: string | undefined) {
  return error
    ? { "aria-invalid": true, "aria-describedby": `${id}-error` }
    : {};
}
