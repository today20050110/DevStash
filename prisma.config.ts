import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Neon 的連線字串寫在 .env.local。Next.js 會自動讀，Prisma CLI 不會 —— 要手動載入。
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // migration 走 unpooled 直連。connection pooler 不保留 session 狀態，
    // 而 schema engine 需要 advisory lock 與長交易。
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
