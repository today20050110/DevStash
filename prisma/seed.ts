import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../src/generated/prisma/client";
import type { ItemKind } from "../src/generated/prisma/enums";

// 與 prisma.config.ts 一致：CLI 只讀 .env，Neon 的連線字串在 .env.local
config({ path: ".env.local" });

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

interface SystemItemType {
  name: string;
  slug: string;
  kind: ItemKind;
  /** lucide-react icon name */
  icon: string;
  color: string;
  isProOnly: boolean;
}

/**
 * 7 種系統型別。色碼與圖示對應 project-overview.md §8 的型別視覺對照表。
 * Free 方案不含 file / image（§6），故這兩者 isProOnly = true。
 */
const SYSTEM_ITEM_TYPES: SystemItemType[] = [
  {
    name: "Snippets",
    slug: "snippets",
    kind: "TEXT",
    icon: "Code",
    color: "#3b82f6",
    isProOnly: false,
  },
  {
    name: "Prompts",
    slug: "prompts",
    kind: "TEXT",
    icon: "Sparkles",
    color: "#8b5cf6",
    isProOnly: false,
  },
  {
    name: "Commands",
    slug: "commands",
    kind: "TEXT",
    icon: "Terminal",
    color: "#f97316",
    isProOnly: false,
  },
  {
    name: "Notes",
    slug: "notes",
    kind: "TEXT",
    icon: "StickyNote",
    color: "#fde047",
    isProOnly: false,
  },
  {
    name: "Files",
    slug: "files",
    kind: "FILE",
    icon: "File",
    color: "#6b7280",
    isProOnly: true,
  },
  {
    name: "Images",
    slug: "images",
    kind: "FILE",
    icon: "Image",
    color: "#ec4899",
    isProOnly: true,
  },
  {
    name: "Links",
    slug: "links",
    kind: "URL",
    icon: "Link",
    color: "#10b981",
    isProOnly: false,
  },
];

async function seedSystemItemTypes(): Promise<void> {
  // 系統型別的 userId 為 null，而 Prisma 的 @@unique([userId, slug]) 複合唯一
  // 輸入不接受 null，所以無法用 upsert —— 改以 findFirst 判斷後 create/update。
  // 真正擋重複的是 migration 裡的 partial unique index ItemType_slug_system_key。
  let created = 0;
  let updated = 0;

  for (const type of SYSTEM_ITEM_TYPES) {
    const existing = await prisma.itemType.findFirst({
      where: { slug: type.slug, userId: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.itemType.update({
        where: { id: existing.id },
        data: { ...type, isSystem: true },
      });
      updated += 1;
    } else {
      await prisma.itemType.create({
        data: { ...type, isSystem: true, userId: null },
      });
      created += 1;
    }
  }

  console.log(`system item types — created: ${created}, updated: ${updated}`);
}

async function main(): Promise<void> {
  await seedSystemItemTypes();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
