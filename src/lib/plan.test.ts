import { describe, expect, it } from "vitest";

import {
  canUploadFiles,
  checkContentSize,
  FREE_CONTENT_LIMIT_BYTES,
  getCollectionLimit,
  getItemLimit,
  PRO_CONTENT_LIMIT_BYTES,
} from "@/lib/plan";

describe("getItemLimit", () => {
  it("Free 50 筆、Pro 不限", () => {
    expect(getItemLimit(false)).toBe(50);
    expect(getItemLimit(true)).toBeNull();
  });
});

describe("getCollectionLimit", () => {
  it("Free 3 個、Pro 不限", () => {
    expect(getCollectionLimit(false)).toBe(3);
    expect(getCollectionLimit(true)).toBeNull();
  });
});

describe("checkContentSize", () => {
  it("剛好等於上限時通過，多 1 byte 就失敗", () => {
    expect(
      checkContentSize("a".repeat(FREE_CONTENT_LIMIT_BYTES), false),
    ).toBeNull();
    expect(
      checkContentSize("a".repeat(FREE_CONTENT_LIMIT_BYTES + 1), false),
    ).toBe("Content must be 100 KB or less");
  });

  it("以 UTF-8 bytes 計算，中文一字 3 bytes", () => {
    const chars = Math.floor(FREE_CONTENT_LIMIT_BYTES / 3) + 1;
    expect(checkContentSize("中".repeat(chars), false)).not.toBeNull();
  });

  it("Pro 上限為 1 MB；沒有 content 時不檢查", () => {
    expect(
      checkContentSize("a".repeat(FREE_CONTENT_LIMIT_BYTES + 1), true),
    ).toBeNull();
    expect(
      checkContentSize("a".repeat(PRO_CONTENT_LIMIT_BYTES + 1), true),
    ).toBe("Content must be 1024 KB or less");
    expect(checkContentSize(null, false)).toBeNull();
  });
});

describe("canUploadFiles", () => {
  it("開發期對所有人開放（§6 的 Pro 限定待 Stripe 上線後啟用）", () => {
    expect(canUploadFiles(false)).toBe(true);
    expect(canUploadFiles(true)).toBe(true);
  });
});
