import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// 執行期走 Neon 的 pooled 連線；migration 另走 unpooled（見 prisma.config.ts）
const createPrismaClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      // serverless：一個請求最多 5～6 個查詢且多半併發，不需要 pg 預設的 10
      max: 5,
      // pg 預設不掛計時器，等同無限期等待取得連線 —— Neon 冷啟動時
      // 請求會一路卡到 Vercel 函式逾時，錯誤訊息也看不出是資料庫的問題
      connectionTimeoutMillis: 10_000,
    }),
  });

// dev 的 hot reload 每次都會重新求值模組，不快取會把連線數耗盡
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
