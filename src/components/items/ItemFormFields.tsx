import type { ReactNode } from "react";

import type { UpdateItemField } from "@/actions/items";
import { CodeEditor } from "@/components/items/CodeEditor";
import { Section } from "@/components/items/ItemDrawerSections";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getEditorLanguage } from "@/lib/code-language";
import type { ItemTypeFields } from "@/lib/item-fields";

export type ItemFormValues = Record<UpdateItemField, string>;
export type ItemFormErrors = Partial<Record<UpdateItemField, string>>;

export const EMPTY_ITEM_FORM_VALUES: ItemFormValues = {
  title: "",
  description: "",
  content: "",
  language: "",
  url: "",
  tags: "",
};

interface ItemFormFieldsProps {
  /** 依型別決定要顯示的欄位（getItemTypeFields） */
  fields: ItemTypeFields;
  /** 型別的 slug，決定程式碼編輯器沒填語言時的預設（commands 為 shell） */
  typeSlug: string;
  values: ItemFormValues;
  errors: ItemFormErrors;
  setValue: (field: UpdateItemField, value: string) => void;
  /** 新增時 URL 型別的 url 必填；編輯時沿用原本的選填 */
  urlRequired?: boolean;
}

/**
 * Title、Description、型別專屬欄位、Tags。drawer 的編輯模式與新增 dialog 共用；
 * snippets／commands 的 Content 用程式碼編輯器，其他型別用 Textarea。
 * 只顯示該型別適用的欄位，伺服器端以同一個 getItemTypeFields 忽略其他欄位。
 */
export function ItemFormFields({
  fields,
  typeSlug,
  values,
  errors,
  setValue,
  urlRequired = false,
}: ItemFormFieldsProps) {
  const editorLanguage = getEditorLanguage(typeSlug, values.language);

  return (
    <>
      <ItemFormField id="item-title" label="Title" error={errors.title}>
        <Input
          id="item-title"
          {...errorProps("item-title", errors.title)}
          value={values.title}
          onChange={(event) => setValue("title", event.target.value)}
          required
          autoFocus
        />
      </ItemFormField>
      <ItemFormField
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
      </ItemFormField>
      {fields.content && fields.language && (
        // Monaco 的輸入框無法以 <label htmlFor> 對應，標題不渲染成 label，改以 ariaLabel 命名
        <ItemFormField
          id="item-content"
          label="Content"
          error={errors.content}
          asLabel={false}
        >
          <CodeEditor
            value={values.content}
            onChange={(value) => setValue("content", value)}
            language={editorLanguage}
            languageLabel={values.language.trim() || editorLanguage}
            ariaLabel="Content"
            invalid={Boolean(errors.content)}
          />
        </ItemFormField>
      )}
      {fields.content && !fields.language && (
        <ItemFormField id="item-content" label="Content" error={errors.content}>
          <Textarea
            id="item-content"
            {...errorProps("item-content", errors.content)}
            value={values.content}
            onChange={(event) => setValue("content", event.target.value)}
            spellCheck={false}
            className="max-h-[50vh] min-h-40 font-mono text-xs md:text-xs"
          />
        </ItemFormField>
      )}
      {fields.language && (
        <ItemFormField
          id="item-language"
          label="Language"
          error={errors.language}
        >
          <Input
            id="item-language"
            {...errorProps("item-language", errors.language)}
            value={values.language}
            onChange={(event) => setValue("language", event.target.value)}
            placeholder="typescript"
          />
        </ItemFormField>
      )}
      {fields.url && (
        <ItemFormField id="item-url" label="URL" error={errors.url}>
          <Input
            id="item-url"
            {...errorProps("item-url", errors.url)}
            type="url"
            value={values.url}
            onChange={(event) => setValue("url", event.target.value)}
            placeholder="https://"
            required={urlRequired}
          />
        </ItemFormField>
      )}
      <ItemFormField id="item-tags" label="Tags" error={errors.tags}>
        <Input
          id="item-tags"
          {...errorProps("item-tags", errors.tags)}
          value={values.tags}
          onChange={(event) => setValue("tags", event.target.value)}
          placeholder="react, hooks, auth"
        />
      </ItemFormField>
    </>
  );
}

interface ItemFormFieldProps {
  id: string;
  label: string;
  error?: string;
  /** 標題渲染成對應 id 的 <label>；欄位不是原生輸入框時設為 false */
  asLabel?: boolean;
  children: ReactNode;
}

export function ItemFormField({
  id,
  label,
  error,
  asLabel = true,
  children,
}: ItemFormFieldProps) {
  return (
    <Section title={label} htmlFor={asLabel ? id : undefined}>
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
