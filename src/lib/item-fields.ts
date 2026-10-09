import type { ItemKind } from "@/generated/prisma/enums";

/** 有程式語言欄位的系統型別（依 slug） */
const LANGUAGE_TYPE_SLUGS = ["snippets", "commands"];
/** Content 以 Markdown 編輯與顯示的系統型別（依 slug） */
const MARKDOWN_TYPE_SLUGS = ["notes", "prompts"];

export interface ItemTypeFields {
  content: boolean;
  language: boolean;
  /** Content 用 Markdown 編輯器（只影響畫面，伺服器端照樣存純文字） */
  markdown: boolean;
  url: boolean;
}

/**
 * 依型別決定可編輯的型別專屬欄位。drawer 的表單與伺服器端的更新共用，
 * 伺服器端以此忽略不屬於該型別的欄位（例如替 snippet 寫入 url）。
 * Content 與 URL 依 kind 判斷，日後的自訂型別也適用。
 */
export function getItemTypeFields(type: {
  kind: ItemKind;
  slug: string;
}): ItemTypeFields {
  const content = type.kind === "TEXT";
  return {
    content,
    language: LANGUAGE_TYPE_SLUGS.includes(type.slug),
    markdown: content && MARKDOWN_TYPE_SLUGS.includes(type.slug),
    url: type.kind === "URL",
  };
}
