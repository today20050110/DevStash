import { describe, expect, it } from "vitest";

import {
  aiDailyLimitMessage,
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
  it("只有 Pro 可以上傳檔案與圖片（§6）", () => {
    expect(canUploadFiles(false)).toBe(false);
    expect(canUploadFiles(true)).toBe(true);
  });
});

describe("aiDailyLimitMessage", () => {
  const NOW = Date.UTC(2026, 9, 22, 12, 0);
  const at = (minutes: number) => new Date(NOW + minutes * 60_000);

  it("一小時內以分鐘表示", () => {
    expect(aiDailyLimitMessage(at(1), NOW)).toMatch(/in 1 minute\.$/);
    expect(aiDailyLimitMessage(at(45), NOW)).toMatch(/in 45 minutes\.$/);
  });

  it("超過一小時以約略的小時數表示", () => {
    expect(aiDailyLimitMessage(at(70), NOW)).toMatch(/in about 1 hour\.$/);
    expect(aiDailyLimitMessage(at(200), NOW)).toMatch(/in about 3 hours\.$/);
  });

  it("時間已過或很接近時至少顯示 1 分鐘", () => {
    expect(aiDailyLimitMessage(at(-5), NOW)).toMatch(/in 1 minute\.$/);
  });

  it("訊息寫出上限次數", () => {
    expect(aiDailyLimitMessage(at(30), NOW)).toContain("all 50 AI requests");
  });
});
