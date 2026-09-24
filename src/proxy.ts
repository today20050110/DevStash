import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

// 尚未自訂登入頁，導向 Auth.js 的預設頁；登入後經 callbackUrl 回到原頁面
const SIGN_IN_PATH = "/api/auth/signin";

export const proxy = auth((req) => {
  if (req.auth) {
    return NextResponse.next();
  }

  const signInUrl = new URL(SIGN_IN_PATH, req.nextUrl.origin);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
