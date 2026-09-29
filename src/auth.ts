import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import authConfig, { CREDENTIALS_FIELDS } from "@/auth.config";
import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth-errors";
import { signInSchema } from "@/lib/auth-schemas";
import { isEmailVerificationEnabled } from "@/lib/email-verification";
import { verifyAgainstDummyHash, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp, ipEmailKey } from "@/lib/rate-limit";

const credentialsProvider = Credentials({
  credentials: CREDENTIALS_FIELDS,
  // 驗證失敗都回 null：不區分「帳號不存在」、「OAuth 帳號沒有密碼」與「密碼錯誤」。
  // 例外：嘗試次數超過限制時丟出 RateLimitedError；開啟驗證時密碼正確但 email 未驗證，
  // 丟出 EmailNotVerifiedError
  async authorize(credentials, request) {
    const parsed = signInSchema.safeParse(credentials);
    if (!parsed.success) {
      return null;
    }

    const { email, password } = parsed.data;
    // 放在這裡而不是 server action：/api/auth/callback/credentials 可以被直接呼叫
    const limit = await checkRateLimit(
      "signIn",
      ipEmailKey(getClientIp(request.headers), email),
    );
    if (!limit.success) {
      throw new RateLimitedError(limit.reset);
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        passwordHash: true,
        emailVerified: true,
      },
    });
    if (!user?.passwordHash) {
      // 仍跑一次 bcrypt：否則「帳號不存在」比「密碼錯誤」快，可據此判斷 email 是否已註冊
      await verifyAgainstDummyHash(password);
      return null;
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return null;
    }
    if (!user.emailVerified && isEmailVerificationEnabled()) {
      throw new EmailNotVerifiedError();
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
  callbacks: {
    ...authConfig.callbacks,
    /**
     * 只在剛登入（user 有值，帳號密碼與 GitHub 皆同）時從資料庫讀 sessionVersion。
     * 刻意不處理 trigger === "update"：前端也能呼叫 /api/auth/session 觸發它，
     * 若在那裡重讀版本，被偷走的舊 token 就能自行更新到新版本而不會失效。
     */
    async jwt({ token, user }) {
      if (user?.id) {
        const record = await prisma.user.findUnique({
          where: { id: user.id },
          select: { sessionVersion: true },
        });
        token.sessionVersion = record?.sessionVersion ?? 0;
      }
      return token;
    },
  },
  // 以實際驗證邏輯取代 auth.config.ts 的 Credentials 佔位
  providers: authConfig.providers.map((provider) =>
    typeof provider !== "function" && provider.id === "credentials"
      ? credentialsProvider
      : provider,
  ),
});
