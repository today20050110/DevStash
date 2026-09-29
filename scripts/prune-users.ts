/**
 * 刪除 demo 使用者以外的所有使用者與其全部內容。
 *
 *   npm run db:prune-users              # 預演：只列出會刪除的資料，不寫入
 *   npm run db:prune-users -- --confirm # 實際刪除
 *
 * 連線讀 .env（Development）。連到 production endpoint 時一律拒絕，
 * 除非同時加上 --production。
 *
 * 刪除範圍：使用者本身、Account、Session、Item（含 ItemCollection／ItemTag）、
 * Collection、Tag、自訂 ItemType、AiUsage，以及 demo 使用者以外的 VerificationToken。
 * 系統型別（userId 為 null）與 demo 使用者的資料不動。
 * 有 storageKey 的 item 會寫入 PendingDeletion，交給 sweeper 清掉 R2 上的檔案。
 */
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { deleteUsersAndContent } from "../src/lib/db/user-deletion";

const KEEP_EMAIL = "demo@devstash.io";
// CLAUDE.md 記載的 production compute endpoint
const PRODUCTION_ENDPOINT = "ep-sparkling-field-b3cf2urc";

const confirm = process.argv.includes("--confirm");
const allowProduction = process.argv.includes("--production");

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
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

async function main() {
  console.log(`連線主機：${host}`);
  if (host.includes(PRODUCTION_ENDPOINT) && !allowProduction) {
    console.error("這是 production 資料庫，拒絕執行（需要加上 --production）");
    process.exitCode = 1;
    return;
  }

  // 找不到要保留的使用者時中止，否則會把所有人都刪掉
  const keep = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: { id: true },
  });
  if (!keep) {
    console.error(`找不到 ${KEEP_EMAIL}，中止`);
    process.exitCode = 1;
    return;
  }

  const targets = await prisma.user.findMany({
    where: { id: { not: keep.id } },
    select: { id: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  if (targets.length === 0) {
    console.log(`除了 ${KEEP_EMAIL} 之外沒有其他使用者，不需要刪除`);
    return;
  }

  const userIds = targets.map((user) => user.id);
  const owned = { userId: { in: userIds } };
  const otherTokens = { identifier: { not: KEEP_EMAIL } };

  // Item.itemType 是 onDelete: Restrict：demo 的 item 若用到其他使用者的
  // 自訂型別，刪除會失敗，事先擋下並說明
  const blocking = await prisma.item.count({
    where: { userId: keep.id, itemType: owned },
  });
  if (blocking > 0) {
    console.error(
      `${KEEP_EMAIL} 有 ${blocking} 筆 item 使用了其他使用者的自訂型別，中止`,
    );
    process.exitCode = 1;
    return;
  }

  const [items, files, collections, tags, itemTypes, aiUsages, tokens] =
    await Promise.all([
      prisma.item.count({ where: owned }),
      prisma.item.count({ where: { ...owned, storageKey: { not: null } } }),
      prisma.collection.count({ where: owned }),
      prisma.tag.count({ where: owned }),
      prisma.itemType.count({ where: owned }),
      prisma.aiUsage.count({ where: owned }),
      prisma.verificationToken.count({ where: otherTokens }),
    ]);

  console.log(`\n保留：${KEEP_EMAIL}`);
  console.log(`刪除 ${targets.length} 位使用者：`);
  for (const user of targets) {
    console.log(`  - ${user.email}`);
  }
  console.log(
    [
      `\nitems ${items}（其中檔案 ${files}）`,
      `collections ${collections}`,
      `tags ${tags}`,
      `自訂型別 ${itemTypes}`,
      `AI 用量紀錄 ${aiUsages}`,
      `驗證 token ${tokens}`,
    ].join("、"),
  );

  if (!confirm) {
    console.log("\n預演模式，未刪除任何資料。加上 --confirm 才會實際執行。");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await deleteUsersAndContent(tx, userIds);
      await tx.verificationToken.deleteMany({ where: otherTokens });
    },
    { timeout: 60_000 },
  );

  console.log(`\n已刪除 ${targets.length} 位使用者與其全部內容`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
