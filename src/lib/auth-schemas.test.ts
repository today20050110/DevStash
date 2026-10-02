import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  changePasswordSchema,
  emailSchema,
  registerSchema,
  signInSchema,
} from "@/lib/auth-schemas";

const validRegistration = {
  name: "Ada",
  email: "ada@example.com",
  password: "password123",
  confirmPassword: "password123",
};

function registerErrors(input: unknown) {
  const result = registerSchema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("emailSchema", () => {
  it("trims and lowercases, since User.email is case-sensitive unique", () => {
    expect(emailSchema.parse("  Test@Test.com ")).toBe("test@test.com");
  });

  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const errors = registerErrors({
      ...validRegistration,
      password: "short",
      confirmPassword: "short",
    });
    expect(errors.password).toEqual([
      "Password must be at least 8 characters",
    ]);
  });

  // bcrypt 只取前 72 bytes：上限以 UTF-8 bytes 計，不是字元數
  it.each([
    ["72 ASCII bytes", "a".repeat(72), true],
    ["73 ASCII bytes", "a".repeat(73), false],
    ["24 CJK characters (72 bytes)", "密".repeat(24), true],
    ["25 CJK characters (75 bytes)", "密".repeat(25), false],
  ])("enforces the 72-byte limit: %s", (_label, password, ok) => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password,
      confirmPassword: password,
    });
    expect(result.success).toBe(ok);
  });

  it("reports a password mismatch on confirmPassword", () => {
    const errors = registerErrors({
      ...validRegistration,
      confirmPassword: "different123",
    });
    expect(errors.confirmPassword).toEqual(["Passwords do not match"]);
  });

  it("uses a custom message when the body is not an object", () => {
    const result = registerSchema.safeParse("nope");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Request body must be a JSON object",
    );
  });
});

describe("changePasswordSchema", () => {
  it("applies the new-password rules only to the new password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    expect(
      z.flattenError(result.error!).fieldErrors.currentPassword,
    ).toBeUndefined();
  });
});

describe("signInSchema", () => {
  // 規則日後調整時，既有使用者仍要能登入
  it("does not apply password rules", () => {
    expect(
      signInSchema.safeParse({ email: "ada@example.com", password: "x" })
        .success,
    ).toBe(true);
  });
});
