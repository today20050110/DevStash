import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import authConfig, { CREDENTIALS_FIELDS } from "@/auth.config";
import { signInSchema } from "@/lib/auth-schemas";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const credentialsProvider = Credentials({
  credentials: CREDENTIALS_FIELDS,
  // 任何失敗都回 null：不區分「帳號不存在」、「OAuth 帳號沒有密碼」與「密碼錯誤」
  async authorize(credentials) {
    const parsed = signInSchema.safeParse(credentials);
    if (!parsed.success) {
      return null;
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
      },
    });
    if (!user?.passwordHash) {
      return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // 有 adapter 時預設為 database strategy，proxy 每個請求都得查 Session 表；
  // 改用 JWT，proxy 只需驗簽，User 與 Account 仍由 adapter 寫入。
  // Credentials provider 也只支援 JWT strategy。
  session: { strategy: "jwt" },
  ...authConfig,
  // 以實際驗證邏輯取代 auth.config.ts 的 Credentials 佔位
  providers: authConfig.providers.map((provider) =>
    typeof provider !== "function" && provider.id === "credentials"
      ? credentialsProvider
      : provider,
  ),
});
