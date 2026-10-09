import { describe, expect, it } from "vitest";

import { getCopyValue } from "@/lib/item-copy";

describe("getCopyValue", () => {
  it("URL kind 複製網址，忽略 content", () => {
    expect(
      getCopyValue({
        type: { kind: "URL" },
        url: "https://nextjs.org",
        content: "ignored",
      }),
    ).toBe("https://nextjs.org");
  });

  it("TEXT kind 複製 content，保留空白與換行", () => {
    expect(
      getCopyValue({
        type: { kind: "TEXT" },
        url: null,
        content: "  npm run dev\n",
      }),
    ).toBe("  npm run dev\n");
  });

  it("沒有值或為空字串時回傳 null", () => {
    expect(
      getCopyValue({ type: { kind: "TEXT" }, url: null, content: "" }),
    ).toBeNull();
    expect(
      getCopyValue({ type: { kind: "URL" }, url: null, content: null }),
    ).toBeNull();
  });
});
