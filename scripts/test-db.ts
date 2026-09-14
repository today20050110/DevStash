/**
 * 資料庫連線與狀態檢查。
 *
 *   npm run test:db
 *
 * 唯讀 —— 不寫入任何資料，可安全地對任一分支執行。
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";

// Prisma CLI 與 Node 都只讀 .env，Neon 的連線字串寫在 .env.local
config({ path: ".env.local" });

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

/** seed 應該寫入的 7 種系統型別。與 prisma/seed.ts 對照。 */
const EXPECTED_SYSTEM_SLUGS = [
  "snippets",
  "prompts",
  "commands",
  "notes",
  "files",
  "images",
  "links",
];

async function checkConnection(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { db: string; version: string }[]
  >`select current_database() as db, version() as version`;
  const { db, version } = rows[0];
  return {
    name: "連線",
    ok: true,
    detail: `${db} — ${version.split(",")[0]}`,
  };
}

async function checkMigrations(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { migration_name: string; finished_at: Date | null }[]
  >`select migration_name, finished_at from "_prisma_migrations" order by started_at`;
  const pending = rows.filter((r) => r.finished_at === null);
  return {
    name: "Migration",
    ok: rows.length > 0 && pending.length === 0,
    detail:
      rows.length === 0
        ? "沒有任何 migration 記錄"
        : `${rows.length} 筆已套用${pending.length > 0 ? `，${pending.length} 筆未完成` : ""}`,
  };
}

async function checkPgTrgm(): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<
    { extname: string }[]
  >`select extname from pg_extension where extname = 'pg_trgm'`;
  return {
    name: "pg_trgm",
    ok: rows.length === 1,
    detail: rows.length === 1 ? "已安裝" : "未安裝（搜尋會退化為全表掃描）",
  };
}

async function checkSystemItemTypes(): Promise<CheckResult> {
  const types = await prisma.itemType.findMany({
    where: { userId: null, isSystem: true },
    select: { slug: true },
  });
  const found = new Set(types.map((t) => t.slug));
  const missing = EXPECTED_SYSTEM_SLUGS.filter((slug) => !found.has(slug));
  return {
    name: "系統型別",
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${types.length} 種齊全`
        : `缺少 ${missing.join(", ")} —— 請執行 npx prisma db seed`,
  };
}

async function checkRowCounts(): Promise<CheckResult> {
  const [users, items, collections, tags] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.collection.count(),
    prisma.tag.count(),
  ]);
  return {
    name: "資料列數",
    ok: true,
    detail: `user ${users} / item ${items} / collection ${collections} / tag ${tags}`,
  };
}

/**
 * 把拋出的例外轉成 FAIL，而不是中斷整趟檢查。
 * 未套用 migration 的資料庫缺表時會拋錯，而那正是本腳本該診斷出來的情況。
 */
async function runCheck(
  name: string,
  check: () => Promise<CheckResult>,
): Promise<CheckResult> {
  try {
    return await check();
  } catch (error) {
    // 取「最後」一個非空行：Prisma 的多行錯誤把真正的原因放在最後
    // （前幾行只說哪個呼叫失敗），而單行錯誤的首行即末行，兩者都適用。
    const raw = error instanceof Error ? error.message : String(error);
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const cause = lines.at(-1) ?? "未知錯誤";
    const detail = cause.length > 100 ? `${cause.slice(0, 100)}…` : cause;
    return { name, ok: false, detail };
  }
}

async function main(): Promise<void> {
  const branch = process.env.NEON_BRANCH ?? "(未知)";
  console.log(`Neon 分支：${branch}\n`);

  const checks = [
    await runCheck("連線", checkConnection),
    await runCheck("Migration", checkMigrations),
    await runCheck("pg_trgm", checkPgTrgm),
    await runCheck("系統型別", checkSystemItemTypes),
    await runCheck("資料列數", checkRowCounts),
  ];

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name.padEnd(10)} ${check.detail}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} 項通過`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
