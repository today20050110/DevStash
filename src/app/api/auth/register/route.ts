import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { registerSchema } from "@/lib/auth-schemas";
import {
  isEmailVerificationEnabled,
  issueVerificationEmail,
} from "@/lib/email-verification";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getClientIp,
  rateLimitMessage,
  retryAfterSeconds,
} from "@/lib/rate-limit";

interface RegisterResponse {
  success: boolean;
  data?: {
    id: string;
    name: string | null;
    email: string;
    // 關閉驗證時為 false，verificationEmailSent 也會是 false，前端不該提示寄信失敗
    verificationRequired: boolean;
    verificationEmailSent: boolean;
  };
  error?: string;
}

const EMAIL_TAKEN = "An account with this email already exists";

function errorResponse(error: string, status: number) {
  return NextResponse.json<RegisterResponse>(
    { success: false, error },
    { status },
  );
}

export async function POST(request: Request) {
  // 放在解析 body 之前：格式錯誤的請求也要計入
  const limit = await checkRateLimit("register", getClientIp(request.headers));
  if (!limit.success) {
    return NextResponse.json<RegisterResponse>(
      { success: false, error: rateLimitMessage(limit.reset) },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(limit.reset)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0].message, 400);
  }

  const { name, email, password } = parsed.data;

  // 同 email 已存在（含 GitHub 登入建立的帳號）一律拒絕，不替既有帳號補上密碼
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return errorResponse(EMAIL_TAKEN, 409);
  }

  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password) },
      select: { id: true, name: true, email: true },
    });
    // 寄信失敗不回滾帳號（issueVerificationEmail 不會丟出）：使用者可從登入頁重寄
    const verificationRequired = isEmailVerificationEnabled();
    const verificationEmailSent =
      verificationRequired && (await issueVerificationEmail(user.email));
    return NextResponse.json<RegisterResponse>(
      {
        success: true,
        data: { ...user, verificationRequired, verificationEmailSent },
      },
      { status: 201 },
    );
  } catch (error) {
    // 兩個請求同時註冊同一 email：查詢時都不存在，由 unique constraint 擋下後者
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse(EMAIL_TAKEN, 409);
    }
    console.error("Registration failed", error);
    return errorResponse("Registration failed, please try again", 500);
  }
}
