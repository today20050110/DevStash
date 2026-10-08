import { describe, expect, it } from "vitest";

import {
  checkContentSize,
  FREE_CONTENT_LIMIT_BYTES,
  getItemLimit,
  isPro,
  PRO_CONTENT_LIMIT_BYTES,
  type PlanFields,
} from "@/lib/plan";

const NOW = new Date("2026-10-09T00:00:00Z");
const NEXT_MONTH = new Date("2026-11-09T00:00:00Z");

const ACTIVE_PRO: PlanFields = {
  plan: "PRO",
  subscriptionStatus: "ACTIVE",
  currentPeriodEnd: NEXT_MONTH,
};

describe("isPro", () => {
  it("有效的 Pro 訂閱（ACTIVE／TRIALING）", () => {
    expect(isPro(ACTIVE_PRO, NOW)).toBe(true);
    expect(isPro({ ...ACTIVE_PRO, subscriptionStatus: "TRIALING" }, NOW)).toBe(
      true,
    );
  });

  it("Free 方案、付費期間已過或沒有期間結束日都不是 Pro", () => {
    expect(isPro({ ...ACTIVE_PRO, plan: "FREE" }, NOW)).toBe(false);
    expect(isPro({ ...ACTIVE_PRO, currentPeriodEnd: NOW }, NOW)).toBe(false);
    expect(isPro({ ...ACTIVE_PRO, currentPeriodEnd: null }, NOW)).toBe(false);
  });

  it.each(["PAST_DUE", "CANCELED", "UNPAID"] as const)(
    "%s 不是 Pro",
    (subscriptionStatus) => {
      expect(isPro({ ...ACTIVE_PRO, subscriptionStatus }, NOW)).toBe(false);
    },
  );
});

describe("getItemLimit", () => {
  it("Free 50 筆、Pro 不限", () => {
    expect(getItemLimit(false)).toBe(50);
    expect(getItemLimit(true)).toBeNull();
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
