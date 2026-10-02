import { describe, expect, it } from "vitest";

import { DEFAULT_REDIRECT, getSafeRedirect } from "@/lib/redirect";

describe("getSafeRedirect", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(getSafeRedirect("/items/snippets?x=1#top")).toBe(
      "/items/snippets?x=1#top",
    );
  });

  it("normalizes the path", () => {
    expect(getSafeRedirect("/dashboard/../profile")).toBe("/profile");
  });

  it.each([undefined, null, 42, ["/dashboard"], ""])(
    "falls back for non-path value %j",
    (value) => {
      expect(getSafeRedirect(value)).toBe(DEFAULT_REDIRECT);
    },
  );

  // Auth Phase 3 的 review 中實際重現過的繞過手法
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
  ])("rejects off-site target %j", (value) => {
    expect(getSafeRedirect(value)).toBe(DEFAULT_REDIRECT);
  });
});
