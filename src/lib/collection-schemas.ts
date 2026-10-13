import { z } from "zod";

import { optionalText } from "@/lib/item-schemas";

/** 卡片與側邊欄只顯示一行名稱、兩行描述；上限擋的是把它們當成大型文字欄位用 */
export const COLLECTION_NAME_MAX_LENGTH = 100;
export const COLLECTION_DESCRIPTION_MAX_LENGTH = 500;

export const createCollectionSchema = z.object(
  {
    name: z
      .string({ error: "Name is required" })
      .trim()
      .min(1, "Name is required")
      .max(
        COLLECTION_NAME_MAX_LENGTH,
        `Name must be ${COLLECTION_NAME_MAX_LENGTH} characters or less`,
      ),
    description: optionalText({ trim: true }).refine(
      (value) =>
        value === null || value.length <= COLLECTION_DESCRIPTION_MAX_LENGTH,
      `Description must be ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters or less`,
    ),
  },
  { error: "Invalid collection data" },
);

export type CreateCollectionInput = z.input<typeof createCollectionSchema>;
export type CreateCollectionData = z.output<typeof createCollectionSchema>;
