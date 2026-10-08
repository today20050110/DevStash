import type { ItemKind } from "@/generated/prisma/enums";

/** 有程式語言欄位的系統型別（依 slug） */
const LANGUAGE_TYPE_SLUGS = ["snippets", "commands"];

export interface ItemTypeFields {
  content: boolean;
  language: boolean;
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
  return {
    content: type.kind === "TEXT",
    language: LANGUAGE_TYPE_SLUGS.includes(type.slug),
    url: type.kind === "URL",
  };
}
