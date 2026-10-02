import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  requestPasswordResetAction,
  resetPasswordAction,
} from "@/actions/password-reset";
import {
  RESET_LINK_ERRORS,
  requestPasswordReset,
  resetPassword,
} from "@/lib/password-reset";
import { checkRateLimit } from "@/lib/rate-limit";

// Server action 的測試只驗證 action 本身的流程（驗證、速率限制、錯誤對應、導向），
// 資料庫與外部服務一律 mock。@/lib/prisma 在沒有 DATABASE_URL 時會直接丟錯，
// 漏 mock 的話測試會失敗，而不是連到真的資料庫。
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/lib/password-reset", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/password-reset")>()),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit: vi.fn(),
  getActionClientIp: vi.fn(async () => "203.0.113.7"),
}));

// redirect() 實際上會丟出特殊例外中斷執行，這裡保留這個行為
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

// after() 在回應送出後才執行；測試中收集起來手動執行
const afterCallbacks: Array<() => Promise<void>> = [];
vi.mock("next/server", () => ({
  after: vi.fn((callback: () => Promise<void>) => {
    afterCallbacks.push(callback);
  }),
}));

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const ALLOWED = { success: true, remaining: 1, reset: 0 };

beforeEach(() => {
  afterCallbacks.length = 0;
  vi.mocked(checkRateLimit).mockResolvedValue(ALLOWED);
});

describe("requestPasswordResetAction", () => {
  it("rejects an invalid email before touching the rate limiter", async () => {
    const result = await requestPasswordResetAction(
      { success: false },
      form({ email: "nope" }),
    );
    expect(result).toEqual({ success: false, error: "Invalid email address" });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("returns the rate-limit message when blocked", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 5 * 60_000,
    });
    const result = await requestPasswordResetAction(
      { success: false },
      form({ email: "ada@example.com" }),
    );
    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again in 5 minutes.",
    });
    expect(checkRateLimit).toHaveBeenCalledWith("forgotPassword", "203.0.113.7");
  });

  // 不論帳號是否存在都回同一則訊息，實際工作延到 after()，回應時間不透露帳號狀態
  it("responds before doing the work and normalizes the email", async () => {
    const result = await requestPasswordResetAction(
      { success: false },
      form({ email: "  Ada@Example.com " }),
    );
    expect(result.success).toBe(true);
    expect(requestPasswordReset).not.toHaveBeenCalled();

    await Promise.all(afterCallbacks.map((callback) => callback()));
    expect(requestPasswordReset).toHaveBeenCalledWith("ada@example.com");
  });

  it("only logs errors raised after the response", async () => {
    vi.mocked(requestPasswordReset).mockRejectedValue(new Error("db down"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await requestPasswordResetAction(
      { success: false },
      form({ email: "ada@example.com" }),
    );
    await expect(afterCallbacks[0]()).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("resetPasswordAction", () => {
  const validReset = {
    email: "ada@example.com",
    token: "abc",
    password: "newpassword1",
    confirmPassword: "newpassword1",
  };

  it("checks the rate limit before validating input", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60_000,
    });
    const result = await resetPasswordAction({ success: false }, form({}));
    expect(result.error).toMatch(/^Too many attempts/);
  });

  it("treats a missing token as an invalid link", async () => {
    const result = await resetPasswordAction(
      { success: false },
      form({ ...validReset, token: "" }),
    );
    expect(result).toEqual({
      success: false,
      error: RESET_LINK_ERRORS.invalid,
      linkInvalid: true,
    });
  });

  it("returns field errors for a weak password", async () => {
    const result = await resetPasswordAction(
      { success: false },
      form({ ...validReset, password: "short", confirmPassword: "short" }),
    );
    expect(result.fieldErrors?.password).toBe(
      "Password must be at least 8 characters",
    );
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it("maps an expired token to the expired-link error", async () => {
    vi.mocked(resetPassword).mockResolvedValue("expired");
    const result = await resetPasswordAction(
      { success: false },
      form(validReset),
    );
    expect(result).toEqual({
      success: false,
      error: RESET_LINK_ERRORS.expired,
      linkInvalid: true,
    });
  });

  it("redirects to sign-in with the email after a successful reset", async () => {
    vi.mocked(resetPassword).mockResolvedValue("reset");
    await expect(
      resetPasswordAction({ success: false }, form(validReset)),
    ).rejects.toThrow(
      "NEXT_REDIRECT /sign-in?reset=1&email=ada%40example.com",
    );
    expect(resetPassword).toHaveBeenCalledWith(
      "ada@example.com",
      "abc",
      "newpassword1",
    );
  });

  it("returns a generic error when the reset throws", async () => {
    vi.mocked(resetPassword).mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await resetPasswordAction(
      { success: false },
      form(validReset),
    );
    expect(result).toEqual({
      success: false,
      error: "Something went wrong, please try again",
    });
  });
});
