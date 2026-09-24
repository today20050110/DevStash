import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * 不含 adapter 的共用設定，proxy 只 import 這一份 ——
 * adapter 會帶進 Prisma 與 pg driver，不該出現在 proxy 的 bundle 裡。
 */
export default {
  providers: [GitHub],
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
