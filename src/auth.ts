import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // 有 adapter 時預設為 database strategy，proxy 每個請求都得查 Session 表；
  // 改用 JWT，proxy 只需驗簽，User 與 Account 仍由 adapter 寫入
  session: { strategy: "jwt" },
  ...authConfig,
});
