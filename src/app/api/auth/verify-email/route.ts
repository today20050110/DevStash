import { NextResponse, type NextRequest } from "next/server";

import { SIGN_IN_PATH } from "@/auth.config";
import {
  verifyEmailToken,
  type VerifyEmailResult,
} from "@/lib/email-verification";

// 對應 /sign-in 的 ?verified=1 與 ?error= 代碼
const RESULT_PARAMS: Record<VerifyEmailResult, Record<string, string>> = {
  verified: { verified: "1" },
  "already-verified": { verified: "1" },
  expired: { error: "VerificationExpired" },
  invalid: { error: "VerificationInvalid" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const email = searchParams.get("email")?.trim().toLowerCase();
  const token = searchParams.get("token");

  const result: VerifyEmailResult =
    email && token ? await verifyEmailToken(email, token) : "invalid";

  const url = new URL(SIGN_IN_PATH, request.nextUrl.origin);
  for (const [key, value] of Object.entries(RESULT_PARAMS[result])) {
    url.searchParams.set(key, value);
  }
  // 預填登入表單的 email，過期或無效時也方便直接重寄
  if (email) {
    url.searchParams.set("email", email);
  }
  return NextResponse.redirect(url);
}
