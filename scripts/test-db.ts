/**
 * 資料庫連線與狀態檢查。
 *
 *   npm run test:db
 *
 * 唯讀 —— 不寫入任何資料，可安全地對任一分支執行。
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { compare } from "bcryptjs";
import "dotenv/config";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const connectionSource = process.env.DATABASE_URL_UNPOOLED
  ? "DATABASE_URL_UNPOOLED"
  : "DATABASE_URL";
const connectionString = process.env[connectionSource];

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");
}

/** 只取主機名稱，避免把帳號密碼印到終端機 */
function connectionHost(url: string): string {
  try {
    return new URL(url).host || "(無法解析)";
  } catch {
    return "(無法解析)";
  }
}

const host = connectionHost(connectionString);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
  /** 刻意不存在的資料（例如 production 沒有 demo 資料）不算失敗 */
  skipped?: boolean;
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

const DEMO_EMAIL = "demo@devstash.io";
const DEMO_PASSWORD = "12345678";

/** 各 demo collection 的型別組成。與 prisma/seed.ts 的 DEMO_COLLECTIONS 對照。 */
const EXPECTED_DEMO_COLLECTIONS: Record<string, Record<string, number>> = {
  "ai-workflows": { prompts: 3 },
  "design-resources": { links: 4 },
  devops: { commands: 1, links: 2, snippets: 1 },
  "react-patterns": { snippets: 3 },
  "terminal-commands": { commands: 4 },
};

const DEMO_INCLUDE = {
  _count: { select: { items: true } },
  collections: {
    orderBy: { name: "asc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { item: { include: { itemType: true } } },
      },
    },
  },
} satisfies Prisma.UserInclude;

type DemoUser = Prisma.UserGetPayload<{ include: typeof DEMO_INCLUDE }>;
type DemoCollection = DemoUser["collections"][number];
type DemoItem = DemoCollection["items"][number]["item"];

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

function formatComposition(counts: Record<string, number>): string {
  return Object.keys(counts)
    .sort()
    .map((slug) => `${slug}:${counts[slug]}`)
    .join(", ");
}

/** TEXT 型別只該有 content、URL 型別只該有 url */
function hasKindMismatch(item: DemoItem): boolean {
  if (item.itemType.kind === "URL") return !item.url || item.content !== null;
  if (item.itemType.kind === "TEXT") return !item.content || item.url !== null;
  return false;
}

async function findAccountProblems(user: DemoUser): Promise<string[]> {
  const problems: string[] = [];
  if (user.plan !== "FREE") problems.push(`plan 為 ${user.plan}`);
  if (!user.emailVerified) problems.push("emailVerified 未設定");
  if (!user.passwordHash || !(await compare(DEMO_PASSWORD, user.passwordHash))) {
    problems.push("密碼雜湊不符");
  }
  return problems;
}

function findContentProblems(user: DemoUser): string[] {
  const problems: string[] = [];
  const expectedSlugs = Object.keys(EXPECTED_DEMO_COLLECTIONS).sort();
  const actualSlugs = user.collections.map((c) => c.slug).sort();
  if (expectedSlugs.join() !== actualSlugs.join()) {
    problems.push(`collections 為 [${actualSlugs.join(", ")}]`);
  }

  for (const collection of user.collections) {
    const expected = EXPECTED_DEMO_COLLECTIONS[collection.slug];
    if (!expected) continue;
    const counts: Record<string, number> = {};
    for (const { item } of collection.items) {
      counts[item.itemType.slug] = (counts[item.itemType.slug] ?? 0) + 1;
    }
    if (formatComposition(counts) !== formatComposition(expected)) {
      problems.push(`${collection.slug} 組成為 ${formatComposition(counts)}`);
    }
  }

  const items = user.collections.flatMap((c) => c.items.map((ic) => ic.item));
  const mismatched = items.filter(hasKindMismatch).length;
  if (mismatched > 0) problems.push(`${mismatched} 筆 item 的欄位與型別不符`);
  if (items.length !== user._count.items) {
    problems.push(`${user._count.items - items.length} 筆 item 不屬於任何 collection`);
  }
  return problems;
}

async function checkDemoData(user: DemoUser | null): Promise<CheckResult> {
  if (!user) {
    return {
      name: "Demo 資料",
      ok: true,
      skipped: true,
      detail: "未寫入 —— 需要時以 SEED_DEMO=1 執行 seed",
    };
  }

  const problems = [
    ...(await findAccountProblems(user)),
    ...findContentProblems(user),
  ];
  return {
    name: "Demo 資料",
    ok: problems.length === 0,
    detail:
      problems.length === 0
        ? `collection ${user.collections.length} / item ${user._count.items}，內容符合 seed`
        : problems.join("；"),
  };
}

function printDemoData(user: DemoUser): void {
  const verified = user.emailVerified?.toISOString().slice(0, 10) ?? "未驗證";
  console.log(`\nDemo 資料 —— ${user.name} <${user.email}>`);
  console.log(`  plan ${user.plan} · emailVerified ${verified}`);

  for (const collection of user.collections) {
    console.log(
      `\n  ${collection.name} (${collection.items.length}) — ${collection.description ?? ""}`,
    );
    for (const { item } of collection.items) {
      const extra = item.url ?? item.language ?? "";
      console.log(
        `    [${item.itemType.slug.padEnd(8)}] ${item.title}${extra ? `  · ${extra}` : ""}`,
      );
    }
  }
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
  // NEON_BRANCH 只是 .env 裡的標籤，實際連到哪裡要看連線字串
  const branch = process.env.NEON_BRANCH ?? "(未設定)";
  console.log(`連線主機：${host}（${connectionSource}）`);
  console.log(`NEON_BRANCH 標籤：${branch}\n`);

  // 由檢查順便取回 demo 資料，檢查通過後再印出，避免查兩次
  const demo: { user: DemoUser | null } = { user: null };

  const checks = [
    await runCheck("連線", checkConnection),
    await runCheck("Migration", checkMigrations),
    await runCheck("pg_trgm", checkPgTrgm),
    await runCheck("系統型別", checkSystemItemTypes),
    await runCheck("資料列數", checkRowCounts),
    await runCheck("Demo 資料", async () => {
      demo.user = await prisma.user.findUnique({
        where: { email: DEMO_EMAIL },
        include: DEMO_INCLUDE,
      });
      return checkDemoData(demo.user);
    }),
  ];

  for (const check of checks) {
    const status = check.skipped ? "SKIP" : check.ok ? "PASS" : "FAIL";
    console.log(`${status}  ${check.name.padEnd(10)} ${check.detail}`);
  }

  if (demo.user) {
    printDemoData(demo.user);
  }

  const failed = checks.filter((c) => !c.ok);
  const skipped = checks.filter((c) => c.skipped).length;
  console.log(
    `\n${checks.length - failed.length}/${checks.length} 項通過${skipped > 0 ? `（其中 ${skipped} 項略過）` : ""}`,
  );

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
