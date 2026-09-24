import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { registerSchema } from "@/lib/auth-schemas";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

interface RegisterResponse {
  success: boolean;
  data?: { id: string; name: string | null; email: string };
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
    return NextResponse.json<RegisterResponse>(
      { success: true, data: user },
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
