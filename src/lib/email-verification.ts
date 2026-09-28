import { createHash, randomBytes } from "node:crypto";

import { sendVerificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

// 信件內文也以這個值顯示期限
const TOKEN_TTL_HOURS = 24;
const TOKEN_TTL_MS = TOKEN_TTL_HOURS * 60 * 60 * 1000;
export const VERIFY_EMAIL_PATH = "/api/auth/verify-email";

export type VerifyEmailResult =
  | "verified"
  | "already-verified"
  | "expired"
  | "invalid";

// 資料庫只存雜湊：資料外洩時拿不到可用的連結
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 驗證連結的網址根。不從請求的 Host header 推導：Host 可被偽造，
 * 會讓驗證信裡的連結指向攻擊者的網域而洩漏 token。
 * 優先用 APP_URL，其次是 Vercel 自動提供的正式網域，最後是本機。
 */
function getAppUrl(): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

/** 建立新 token 並取代該 email 既有的 token，回傳帶原文 token 的連結 */
async function createVerifyUrl(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
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

  if (!record) {
    // 已驗證過的人再點一次舊連結時，不必顯示錯誤
    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });
    return user?.emailVerified ? "already-verified" : "invalid";
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
