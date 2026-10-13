import type { Prisma } from "@/generated/prisma/client";
import type { CollectionData } from "@/lib/collection-schemas";
import { nextAvailableSlug, toCollectionSlug } from "@/lib/collection-slug";
import { prisma } from "@/lib/prisma";
import type {
  CollectionHeader,
  CollectionOption,
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

/** /collections 頁：全部未刪除的 collections */
export function getAllCollections(
  userId: string,
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, {});
}

/**
 * /collections/[id] 的頁首。不屬於該使用者、不存在或已刪除時回傳 null（頁面回 404），
 * 不區分三者
 */
export function getCollectionById(
  userId: string,
  collectionId: string,
): Promise<CollectionHeader | null> {
  return prisma.collection.findFirst({
    where: { id: collectionId, userId, deletedAt: null },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
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

/** item 表單可選的 collections：只取 id 與名稱，依名稱排序 */
export function getCollectionOptions(
  userId: string,
): Promise<CollectionOption[]> {
  return prisma.collection.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
}

/** ids 中屬於該使用者且未刪除的 collection id；不存在、屬於別人或已刪除的不會出現 */
export async function findOwnedCollectionIds(
  userId: string,
  ids: string[],
  client: Pick<Prisma.TransactionClient, "collection"> = prisma,
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }
  const owned = await client.collection.findMany({
    where: { id: { in: ids }, userId, deletedAt: null },
    select: { id: true },
  });
  return owned.map(({ id }) => id);
}

export type CreateCollectionResult =
  | { status: "created"; collection: { id: string; name: string } }
  | { status: "limit-reached"; limit: number };

/**
 * 在 transaction 內檢查額度並建立 collection（§6）。collectionLimit 為 null 代表不限。
 * 與 createItem 相同先取得以 userId 為鍵的 advisory lock，同時送出的兩個請求依序計數，
 * 也不會算出同一個 slug。slug 由名稱產生，同名時加上 -2、-3 後綴；
 * 已軟刪除的 collection 仍佔用 slug（unique 不排除它們），所以查詢不加 deletedAt 條件。
 */
export async function createCollection(
  userId: string,
  data: CollectionData,
  collectionLimit: number | null,
): Promise<CreateCollectionResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    if (collectionLimit !== null) {
      const count = await tx.collection.count({
        where: { userId, deletedAt: null },
      });
      if (count >= collectionLimit) {
        return { status: "limit-reached", limit: collectionLimit } as const;
      }
    }

    const base = toCollectionSlug(data.name);
    const existing = await tx.collection.findMany({
      where: { userId, slug: { startsWith: base } },
      select: { slug: true },
    });
    const collection = await tx.collection.create({
      data: {
        userId,
        name: data.name,
        slug: nextAvailableSlug(
          base,
          existing.map(({ slug }) => slug),
        ),
        description: data.description,
      },
      select: { id: true, name: true },
    });
    return { status: "created", collection } as const;
  });
}

/**
 * 更新 name 與 description。擁有者與「尚未刪除」放在 updateMany 的條件裡，
 * 以 count 判斷；不屬於該使用者、不存在或已刪除時回傳 null。
 * slug 不變：網址用 id，改名後重算 slug 只會多出衝突要處理
 */
export async function updateCollection(
  userId: string,
  collectionId: string,
  data: CollectionData,
): Promise<{ id: string; name: string } | null> {
  const { count } = await prisma.collection.updateMany({
    where: { id: collectionId, userId, deletedAt: null },
    data: { name: data.name, description: data.description },
  });
  return count > 0 ? { id: collectionId, name: data.name } : null;
}

/**
 * 軟刪除：只設定 deletedAt，item 不受影響。ItemCollection 連結保留——所有讀取都排除
 * 已刪除的 collection，item 看起來就是不在這個 collection 了，誤刪時也能從資料庫還原。
 * 回傳 false 代表不存在、屬於別人或已經刪除過
 */
export async function softDeleteCollection(
  userId: string,
  collectionId: string,
): Promise<boolean> {
  const { count } = await prisma.collection.updateMany({
    where: { id: collectionId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count > 0;
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
