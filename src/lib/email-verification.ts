import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { generateToken, getAppUrl, hashToken } from "@/lib/tokens";

// 信件內文也以這個值顯示期限
const TOKEN_TTL_HOURS = 24;
const TOKEN_TTL_MS = TOKEN_TTL_HOURS * 60 * 60 * 1000;
export const VERIFY_EMAIL_PATH = "/api/auth/verify-email";

export type VerifyEmailResult =
  | "verified"
  | "already-verified"
  | "expired"
  | "invalid";

/**
 * 只有 EMAIL_VERIFICATION_ENABLED 為 "true" 時才要求驗證。預設關閉：
 * 開啟需要可寄給任何人的 Resend 網域，漏設時註冊者會永遠無法登入。
 * 關閉期間註冊的帳號 emailVerified 維持 null，重新開啟後需先重寄驗證信。
 */
export function isEmailVerificationEnabled(): boolean {
  return process.env.EMAIL_VERIFICATION_ENABLED === "true";
}

/** 建立新 token 並取代該 email 既有的 token，回傳帶原文 token 的連結 */
async function createVerifyUrl(email: string): Promise<string> {
  const token = generateToken();
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
    prisma.verificationToken.create({
      data: {
        identifier: email,
        token: hashToken(token),
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    }),
  ]);

  const url = new URL(VERIFY_EMAIL_PATH, getAppUrl());
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

/** 寄出驗證信；失敗時回傳 false 而不丟出，讓呼叫端決定如何提示 */
export async function issueVerificationEmail(email: string): Promise<boolean> {
  try {
    const verifyUrl = await createVerifyUrl(email);
    await sendVerificationEmail(email, verifyUrl, TOKEN_TTL_HOURS);
    return true;
  } catch (error) {
    console.error("Failed to issue verification email", error);
    return false;
  }
}

/**
 * 只有以帳號密碼註冊、且尚未驗證的帳號才會收到新連結。
 * 呼叫端對使用者一律顯示相同訊息，不透露 email 是否已註冊。
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  if (!isEmailVerificationEnabled()) {
    return;
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, emailVerified: true },
  });
  if (user?.passwordHash && !user.emailVerified) {
    await issueVerificationEmail(email);
  }
}

/** 驗證並消耗 token：成功與過期都會刪除 token，連結只能使用一次 */
export async function verifyEmailToken(
  email: string,
  token: string,
): Promise<VerifyEmailResult> {
  const where = { identifier: email, token: hashToken(token) };
  const record = await prisma.verificationToken.findFirst({ where });

  // 找不到 token 時不查帳號狀態：否則帶任意 token 就能從導向結果看出
  // 這個 email 是否已註冊且已驗證（已驗證的人再點舊連結，會看到「無效或已使用」）
  if (!record) {
    return "invalid";
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where });
    return "expired";
  }

  return prisma.$transaction(async (tx) => {
    // 兩個請求同時使用同一個連結時，後者的刪除會等前者提交後才回傳 0
    const { count } = await tx.verificationToken.deleteMany({ where });
    if (count === 0) {
      return "already-verified";
    }
    await tx.user.updateMany({
      where: { email, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return "verified";
  });
}
