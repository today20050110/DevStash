import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CollectionSummary,
  CollectionTypeSummary,
} from "@/types/collections";

const RECENT_COLLECTIONS_LIMIT = 6;
const SIDEBAR_RECENT_COLLECTIONS_LIMIT = 10;

type TypeFields = Omit<CollectionTypeSummary, "count">;

/** 同數量時以名稱排序，讓主要型別（決定邊框色）的結果穩定 */
function summarizeTypes(types: TypeFields[]): CollectionTypeSummary[] {
  const byId = new Map<string, CollectionTypeSummary>();
  for (const type of types) {
    const existing = byId.get(type.id);
    if (existing) existing.count += 1;
    else byId.set(type.id, { ...type, count: 1 });
  }
  return [...byId.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

interface CollectionSummaryQuery {
  where?: Prisma.CollectionWhereInput;
  take?: number;
}

/**
 * collections 依建立時間由新到舊，附 item 數量與型別組成。
 * items 以關聯一次載入（不是每個 collection 各查一次），再在記憶體中彙總。
 * userId 與 deletedAt 放在最後，呼叫端傳入的條件無法覆寫。
 */
async function findCollectionSummaries(
  userId: string,
  { where, take }: CollectionSummaryQuery,
): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    where: { ...where, userId, deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isFavorite: true,
      items: {
        // userId 也要限制：join table 本身不帶擁有者
        where: { item: { userId, deletedAt: null } },
        select: {
          item: {
            select: {
              itemType: {
                select: { id: true, name: true, slug: true, icon: true, color: true },
              },
            },
          },
        },
      },
    },
  });

  return collections.map(({ items, ...collection }) => ({
    ...collection,
    itemCount: items.length,
    types: summarizeTypes(items.map(({ item }) => item.itemType)),
  }));
}

export function getRecentCollections(
  userId: string,
  limit = RECENT_COLLECTIONS_LIMIT,
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, { take: limit });
}

export function getFavoriteCollections(
  userId: string,
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, { where: { isFavorite: true } });
}

/** 側邊欄用：收藏已有自己的區塊，這裡排除以免重複列出 */
export function getRecentNonFavoriteCollections(
  userId: string,
  limit = SIDEBAR_RECENT_COLLECTIONS_LIMIT,
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, {
    where: { isFavorite: false },
    take: limit,
  });
}

export async function getCollectionCounts(
  userId: string,
): Promise<{ collections: number; favoriteCollections: number }> {
  const where = { userId, deletedAt: null };
  const [collections, favoriteCollections] = await Promise.all([
    prisma.collection.count({ where }),
    prisma.collection.count({ where: { ...where, isFavorite: true } }),
  ]);
  return { collections, favoriteCollections };
}
