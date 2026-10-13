import { describe, expect, it } from "vitest";

import {
  FIX_FIELDS_MESSAGE,
  validationFailure,
} from "@/lib/action-errors";
import { collectionSchema } from "@/lib/collection-schemas";
import { updateItemSchema } from "@/lib/item-schemas";

function failureOf<T>(result: { success: boolean; error?: T }): T {
  if (result.success || !result.error) {
    throw new Error("expected validation to fail");
  }
  return result.error;
}

describe("validationFailure", () => {
  it("輸入不是物件時回傳表單層級的錯誤，沒有欄位錯誤", () => {
    const error = failureOf(collectionSchema.safeParse("DevOps"));

    expect(validationFailure(error)).toEqual({
      success: false,
      error: "Invalid collection data",
      fieldErrors: {},
    });
  });

  it("欄位錯誤時提示修正欄位，每個欄位只留第一則訊息", () => {
    const error = failureOf(
      collectionSchema.safeParse({ name: "", description: 42 }),
    );

    expect(validationFailure(error)).toEqual({
      success: false,
      error: FIX_FIELDS_MESSAGE,
      fieldErrors: {
        name: "Name is required",
        description: "Must be text",
      },
    });
  });

  it("陣列中個別元素的錯誤歸到該欄位", () => {
    const error = failureOf(
      updateItemSchema.safeParse({ title: "Hooks", tags: ["react", "  "] }),
    );

    expect(validationFailure(error).fieldErrors).toEqual({
      tags: "Tags cannot be empty",
    });
  });
});
