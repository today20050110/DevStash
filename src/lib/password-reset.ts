import { sendPasswordResetEmail } from "@/lib/email";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { generateToken, getAppUrl, hashToken } from "@/lib/tokens";

const TOKEN_TTL_MINUTES = 60;
const TOKEN_TTL_MS = TOKEN_TTL_MINUTES * 60 * 1000;
export const RESET_PASSWORD_PATH = "/reset-password";

// 與 email 驗證共用 VerificationToken：驗證 token 的 identifier 是純 email，
// 加上前綴後兩者互不刪除，驗證連結的 token 也不能拿來重設密碼
const IDENTIFIER_PREFIX = "password-reset:";

export type ResetTokenStatus = "valid" | "expired" | "invalid";
export type ResetPasswordResult = "reset" | "expired" | "invalid";

// 開啟連結時與送出新密碼時共用
export const RESET_LINK_ERRORS = {
  expired: "This reset link has expired. Request a new one.",
  invalid: "This reset link is invalid or has already been used.",
} as const satisfies Record<Exclude<ResetTokenStatus, "valid">, string>;

function resetIdentifier(email: string): string {
  return `${IDENTIFIER_PREFIX}${email}`;
}

function tokenWhere(email: string, token: string) {
  return { identifier: resetIdentifier(email), token: hashToken(token) };
}

/**
 * 只有以帳號密碼註冊的帳號會收到連結：只用 GitHub 登入的帳號沒有密碼，
 * 替它設定密碼等於連結帳號，而兩個方向的連結都已決定拒絕。
 * 呼叫端對使用者一律顯示相同訊息，不透露 email 是否已註冊；寄信失敗只記錄。
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) {
    return;
  }

  const token = generateToken();
  const identifier = resetIdentifier(email);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        identifier,
        token: hashToken(token),
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  const url = new URL(RESET_PASSWORD_PATH, getAppUrl());
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  try {
    await sendPasswordResetEmail(email, url.toString(), TOKEN_TTL_MINUTES);
  } catch (error) {
    console.error("Failed to send password reset email", error);
  }
}

/** 只讀不消耗：開啟連結時先告訴使用者連結是否還能用，郵件掃描器預先打開也不會用掉 */
export async function getResetTokenStatus(
  email: string,
  token: string,
): Promise<ResetTokenStatus> {
  const record = await prisma.verificationToken.findFirst({
    where: tokenWhere(email, token),
    select: { expires: true },
  });
  if (!record) {
    return "invalid";
  }
  return record.expires < new Date() ? "expired" : "valid";
}

/**
 * 驗證並消耗 token 後更新密碼。能收到重設信即證明擁有這個信箱，
 * 所以 emailVerified 原本為 null 時一併寫入。
 * 已發出的 JWT session 無法撤銷，其他裝置在 token 過期前仍保持登入。
 */
export async function resetPassword(
  email: string,
  token: string,
  newPassword: string,
): Promise<ResetPasswordResult> {
  const status = await getResetTokenStatus(email, token);
  if (status !== "valid") {
    if (status === "expired") {
      await prisma.verificationToken.deleteMany({
        where: tokenWhere(email, token),
      });
    }
    return status;
  }

  // bcrypt 較慢，放在 transaction 外
  const passwordHash = await hashPassword(newPassword);
  return prisma.$transaction(async (tx) => {
    // 兩個請求同時使用同一個連結時，後者的刪除會等前者提交後才回傳 0
    const { count } = await tx.verificationToken.deleteMany({
      where: tokenWhere(email, token),
    });
    if (count === 0) {
      return "invalid";
    }
    const updated = await tx.user.updateMany({
      where: { email, passwordHash: { not: null } },
      data: { passwordHash },
    });
    if (updated.count === 0) {
      return "invalid";
    }
    await tx.user.updateMany({
      where: { email, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return "reset";
  });
}
