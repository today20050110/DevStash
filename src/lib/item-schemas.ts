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

/**
 * 列表查詢會載入每一筆的標題、描述與全部標籤（只有 content 刻意不載入），
 * 沒有上限的話，描述就成了繞過 content 100 KB 上限、讓每次列表載入變得巨大的途徑
 */
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const TAG_MAX_LENGTH = 50;
export const MAX_TAGS = 20;

/** 新增與編輯共用的欄位；型別專屬欄位是否適用由呼叫端依 getItemTypeFields 判斷 */
const itemFields = {
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(
      TITLE_MAX_LENGTH,
      `Title must be ${TITLE_MAX_LENGTH} characters or less`,
    ),
  description: optionalText({ trim: true }).refine(
    (value) => value === null || value.length <= DESCRIPTION_MAX_LENGTH,
    `Description must be ${DESCRIPTION_MAX_LENGTH.toLocaleString("en-US")} characters or less`,
  ),
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
        .min(1, "Tags cannot be empty")
        .max(
          TAG_MAX_LENGTH,
          `Each tag must be ${TAG_MAX_LENGTH} characters or less`,
        ),
      { error: "Tags must be a list" },
    )
    .max(MAX_TAGS, `Up to ${MAX_TAGS} tags`)
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
