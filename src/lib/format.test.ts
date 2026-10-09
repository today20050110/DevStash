import { describe, expect, it } from "vitest";

import { formatFileSize } from "@/lib/format";

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [5 * 1024 * 1024, "5 MB"],
    [10.25 * 1024 * 1024, "10.3 MB"],
  ])("%d bytes → %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});
