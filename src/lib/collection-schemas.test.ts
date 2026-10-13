import { describe, expect, it } from "vitest";

import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_NAME_MAX_LENGTH,
  collectionSchema,
} from "@/lib/collection-schemas";

describe("collectionSchema", () => {
  it("name 去掉前後空白；空白的 description 存成 null", () => {
    expect(
      collectionSchema.parse({ name: "  DevOps  ", description: "   " }),
    ).toEqual({ name: "DevOps", description: null });
  });

  it("沒有 description 時為 null", () => {
    expect(collectionSchema.parse({ name: "DevOps" })).toEqual({
      name: "DevOps",
      description: null,
    });
  });

  it("name 必填，只有空白也算沒填", () => {
    const result = collectionSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Name is required");
  });

  it("name 與 description 超過長度上限時失敗", () => {
    expect(
      collectionSchema.safeParse({
        name: "a".repeat(COLLECTION_NAME_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      collectionSchema.safeParse({
        name: "DevOps",
        description: "a".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("剛好在上限內時通過", () => {
    expect(
      collectionSchema.safeParse({
        name: "a".repeat(COLLECTION_NAME_MAX_LENGTH),
        description: "a".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH),
      }).success,
    ).toBe(true);
  });
});
