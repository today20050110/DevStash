import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

// 預設登入頁依這份定義渲染輸入欄位；auth.ts 覆寫 provider 時沿用
export const CREDENTIALS_FIELDS = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
};

/**
 * 不含 adapter 的共用設定，proxy 只 import 這一份 ——
 * adapter 會帶進 Prisma 與 pg driver，不該出現在 proxy 的 bundle 裡。
 * Credentials 在這裡只是佔位，實際驗證在 auth.ts。
 */
export default {
  providers: [
    GitHub,
    Credentials({ credentials: CREDENTIALS_FIELDS, authorize: () => null }),
  ],
  callbacks: {
    // JWT strategy 下 session 不會自帶 id；有 adapter 時 token.sub 就是 User.id
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
