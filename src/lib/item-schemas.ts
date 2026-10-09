import { z } from "zod";

import { isHttpUrl } from "@/lib/url";

/** 可空的文字欄位：空字串（含只有空白）視為沒填，存成 null */
function optionalText({ trim }: { trim: boolean }) {
  return z
    .string({ error: "Must be text" })
    .nullish()
    .transform((value) => {
      if (value == null || value.trim() === "") {
        return null;
      }
      return trim ? value.trim() : value;
    });
}

/** 新增與編輯共用的欄位；型別專屬欄位是否適用由呼叫端依 getItemTypeFields 判斷 */
const itemFields = {
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(1, "Title is required"),
  description: optionalText({ trim: true }),
  // 程式碼的縮排與結尾換行有意義，不 trim
  content: optionalText({ trim: false }),
  language: optionalText({ trim: true }),
  // z.url() 預設接受 javascript: 等 scheme；只收 http(s)，與 drawer 顯示連結時的檢查一致
  url: optionalText({ trim: true }).refine(
    (value) => value === null || isHttpUrl(value),
    "URL must start with http:// or https://",
  ),
  tags: z
    .array(
      z
        .string({ error: "Tags must be text" })
        .trim()
        .min(1, "Tags cannot be empty"),
      { error: "Tags must be a list" },
    )
    .default([]),
};

export const updateItemSchema = z.object(itemFields, {
  error: "Invalid item data",
});

export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type UpdateItemData = z.output<typeof updateItemSchema>;

/**
 * URL 型別的 url 必填、FILE 型別的檔案必填要等查到型別才知道，由 action 另外檢查；
 * 這裡只驗證與型別無關的格式。storageKey 是 /api/uploads 回傳的 key，
 * fileName 是原始檔名，兩者的內容（擁有者、副檔名、大小）由 action 驗證。
 */
export const createItemSchema = z.object(
  {
    itemTypeId: z
      .string({ error: "Choose a type" })
      .trim()
      .min(1, "Choose a type"),
    ...itemFields,
    storageKey: optionalText({ trim: true }),
    fileName: optionalText({ trim: true }),
  },
  { error: "Invalid item data" },
);

export type CreateItemInput = z.input<typeof createItemSchema>;
export type CreateItemData = z.output<typeof createItemSchema>;
