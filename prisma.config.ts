import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Neon 的連線字串寫在 .env.local。Next.js 會自動讀，Prisma CLI 不會 —— 要手動載入。
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // 用 tsx 而非 node：Node 的 ESM 解析要求副檔名，而加上 .ts 需要
    // 放寬整個專案的 allowImportingTsExtensions，不划算。
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // migration 走 unpooled 直連。connection pooler 不保留 session 狀態，
    // 而 schema engine 需要 advisory lock 與長交易。
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
