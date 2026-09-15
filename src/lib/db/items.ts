import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ItemSummary, ItemTypeWithCount } from "@/types/items";

const RECENT_ITEMS_LIMIT = 10;

/** ItemType 沒有排序欄位，依 project-overview.md §8 的型別順序；不在清單中的排最後 */
const SYSTEM_TYPE_ORDER = [
  "snippets",
  "prompts",
  "commands",
  "notes",
  "files",
  "images",
  "links",
];

function typeOrder(slug: string): number {
  const index = SYSTEM_TYPE_ORDER.indexOf(slug);
  return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
}

type SystemItemType = Omit<ItemTypeWithCount, "itemCount">;

/** 系統型別不屬於任何使用者、不含使用者資料，沒有目前使用者時也能查詢 */
export async function getSystemItemTypes(): Promise<SystemItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true, userId: null },
    select: { id: true, name: true, slug: true, icon: true, color: true },
  });
  return types.sort(
    (a, b) =>
      typeOrder(a.slug) - typeOrder(b.slug) || a.name.localeCompare(b.name),
  );
}

/**
 * 系統型別與該使用者在各型別下的 item 數量。
 * 數量以一次 groupBy 計算，不是每個型別各查一次；沒有 item 的型別數量為 0。
 */
export async function getSystemItemTypesWithCounts(
  userId: string,
): Promise<ItemTypeWithCount[]> {
  const [types, counts] = await Promise.all([
    getSystemItemTypes(),
    prisma.item.groupBy({
      by: ["itemTypeId"],
      where: { userId, deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const countByTypeId = new Map(
    counts.map((row) => [row.itemTypeId, row._count._all]),
  );
  return types.map((type) => ({
    ...type,
    itemCount: countByTypeId.get(type.id) ?? 0,
  }));
}

export async function getItemCounts(
  userId: string,
): Promise<{ items: number; favoriteItems: number }> {
  const where = { userId, deletedAt: null };
  const [items, favoriteItems] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.count({ where: { ...where, isFavorite: true } }),
  ]);
  return { items, favoriteItems };
}

interface ItemSummaryQuery {
  where?: Prisma.ItemWhereInput;
  orderBy: Prisma.ItemOrderByWithRelationInput;
  take?: number;
}

/**
 * 卡片用的 item 查詢。型別與標籤隨 item 一次載入，不是每張卡片各查一次。
 * userId 與 deletedAt 放在最後，呼叫端傳入的條件無法覆寫。
 */
async function findItemSummaries(
  userId: string,
  { where, orderBy, take }: ItemSummaryQuery,
): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { ...where, userId, deletedAt: null },
    // 同一次巢狀 create 建立的 items 時間戳相同，以 id 決定同值時的順序，
    // 否則重新整理後列表順序可能改變
    orderBy: [orderBy, { id: "desc" }],
    take,
    select: {
      id: true,
      title: true,
      description: true,
      isFavorite: true,
      pinnedAt: true,
      createdAt: true,
      itemType: { select: { name: true, icon: true, color: true } },
      tags: {
        // tag.userId 也要限制：join table 本身不帶擁有者
        where: { tag: { userId } },
        orderBy: { tag: { name: "asc" } },
        select: { tag: { select: { name: true } } },
      },
    },
  });

  return items.map(({ itemType, tags, ...item }) => ({
    ...item,
    type: itemType,
    tags: tags.map(({ tag }) => tag.name),
  }));
}

export function getPinnedItems(userId: string): Promise<ItemSummary[]> {
  return findItemSummaries(userId, {
    where: { pinnedAt: { not: null } },
    orderBy: { pinnedAt: "desc" },
  });
}

/** pinned 與 recent 是不同維度，已釘選的項目同樣會出現在這裡 */
export function getRecentItems(
  userId: string,
  limit = RECENT_ITEMS_LIMIT,
): Promise<ItemSummary[]> {
  return findItemSummaries(userId, {
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
