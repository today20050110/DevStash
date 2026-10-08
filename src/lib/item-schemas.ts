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

export const updateItemSchema = z.object(
  {
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
  },
  { error: "Invalid item data" },
);

export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type UpdateItemData = z.output<typeof updateItemSchema>;
