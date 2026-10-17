import { beforeEach, describe, expect, it, vi } from "vitest";

describe("getStripe", () => {
  beforeEach(() => {
    // getStripe 會快取 client，每個測試重新載入模組，從沒有 client 的狀態開始
    vi.resetModules();
  });

  it("沒有 STRIPE_SECRET_KEY 時丟出清楚的錯誤，而不是在載入模組時就失敗", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");

    const { getStripe } = await import("@/lib/stripe");

    expect(() => getStripe()).toThrow("STRIPE_SECRET_KEY is not set");
  });

  it("有金鑰時建立 client，之後的呼叫回傳同一個", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");

    const { getStripe } = await import("@/lib/stripe");

    const first = getStripe();
    expect(first.customers).toBeDefined();
    expect(getStripe()).toBe(first);
  });
});
