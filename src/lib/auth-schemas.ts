import { z } from "zod";

const PASSWORD_MIN_LENGTH = 8;
// bcrypt 只取前 72 bytes，超過的部分會被靜默忽略 —— 以 UTF-8 bytes 計，不是字元數
const PASSWORD_MAX_BYTES = 72;

// User.email 的 unique 區分大小寫，比對與寫入前一律 trim + 轉小寫
const emailSchema = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .pipe(z.email("Invalid email address"));

const newPasswordSchema = z
  .string({ error: "Password is required" })
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  )
  .refine(
    (password) =>
      new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
    `Password must be at most ${PASSWORD_MAX_BYTES} bytes`,
  );

export const registerSchema = z
  .object(
    {
      name: z
        .string({ error: "Name is required" })
        .trim()
        .min(1, "Name is required")
        .max(100, "Name must be at most 100 characters"),
      email: emailSchema,
      password: newPasswordSchema,
      confirmPassword: z.string({ error: "Please confirm your password" }),
    },
    { error: "Request body must be a JSON object" },
  )
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// 登入不套用密碼規則：規則日後調整時，既有使用者仍要能登入
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Password is required" }).min(1),
});
