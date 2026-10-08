import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ItemDetail,
  ItemSummary,
  ItemTypeDetail,
  ItemTypeWithCount,
} from "@/types/items";

const RECENT_ITEMS_LIMIT = 10;
const PINNED_ITEMS_LIMIT = 10;

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
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      color: true,
      isProOnly: true,
    },
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

/**
 * 系統型別，或該使用者自訂的型別。自訂型別的 slug 可能與系統型別相同，
 * 此時以系統型別優先；其他使用者的自訂型別一律查不到。
 */
export function getItemTypeBySlug(
  userId: string,
  slug: string,
): Promise<ItemTypeDetail | null> {
  return prisma.itemType.findFirst({
    where: { slug, OR: [{ isSystem: true, userId: null }, { userId }] },
    orderBy: { userId: { sort: "asc", nulls: "first" } },
    select: { id: true, name: true, slug: true, icon: true, color: true },
  });
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

export function getPinnedItems(
  userId: string,
  limit = PINNED_ITEMS_LIMIT,
): Promise<ItemSummary[]> {
  return findItemSummaries(userId, {
    where: { pinnedAt: { not: null } },
    orderBy: { pinnedAt: "desc" },
    take: limit,
  });
}

export function getItemsByType(
  userId: string,
  itemTypeId: string,
): Promise<ItemSummary[]> {
  return findItemSummaries(userId, {
    where: { itemTypeId },
    orderBy: { createdAt: "desc" },
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

/**
 * drawer 用的單筆完整資料。不屬於該使用者或已刪除時回傳 null，
 * 呼叫端一律當作不存在（404），不透露 item 是否屬於別人。
 */
export async function getItemDetail(
  userId: string,
  id: string,
): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      url: true,
      language: true,
      isFavorite: true,
      pinnedAt: true,
      createdAt: true,
      updatedAt: true,
      itemType: { select: { name: true, icon: true, color: true, kind: true } },
      tags: {
        // join table 本身不帶擁有者，tag 與 collection 都要另外限制 userId
        where: { tag: { userId } },
        orderBy: { tag: { name: "asc" } },
        select: { tag: { select: { name: true } } },
      },
      collections: {
        where: { collection: { userId, deletedAt: null } },
        orderBy: { collection: { name: "asc" } },
        select: { collection: { select: { id: true, name: true } } },
      },
    },
  });
  if (!item) {
    return null;
  }

  const { itemType, tags, collections, ...rest } = item;
  return {
    ...rest,
    type: itemType,
    tags: tags.map(({ tag }) => tag.name),
    collections: collections.map(({ collection }) => collection),
  };
}
