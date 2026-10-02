import { describe, expect, it, vi } from "vitest";

import { generateToken, getAppUrl, hashToken } from "@/lib/tokens";

describe("generateToken", () => {
  it("returns 32 random bytes as hex", () => {
    const token = generateToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(generateToken()).not.toBe(token);
  });
});

describe("hashToken", () => {
  it("returns the SHA-256 hex digest", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("getAppUrl", () => {
  it("prefers APP_URL", () => {
    vi.stubEnv("APP_URL", "https://devstash.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "devstash.vercel.app");
    expect(getAppUrl()).toBe("https://devstash.example");
  });

  it("falls back to the Vercel production domain", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "devstash.vercel.app");
    expect(getAppUrl()).toBe("https://devstash.vercel.app");
  });

  it("falls back to localhost", () => {
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    expect(getAppUrl()).toBe("http://localhost:3000");
  });
});
