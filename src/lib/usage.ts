import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

/** Free 方案的上限；數值沿用 plan.ts，不另外寫一份 */
export const MAX_ITEMS = FREE_ITEM_LIMIT;
export const MAX_COLLECTIONS = FREE_COLLECTION_LIMIT;

export interface UserUsage {
  itemCount: number;
  collectionCount: number;
  canCreateItem: boolean;
  canCreateCollection: boolean;
}

/** 已刪除的 item／collection 不佔額度 */
function countItems(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId, deletedAt: null } });
}

function countCollections(userId: string): Promise<number> {
  return prisma.collection.count({ where: { userId, deletedAt: null } });
}

/**
 * 用量與是否還能新增，供顯示（Billing 卡片、升級提示）。
 * Pro 也會計數（顯示用），但一律可以新增
 */
export async function getUserUsage(
  userId: string,
  isPro: boolean,
): Promise<UserUsage> {
  const [itemCount, collectionCount] = await Promise.all([
    countItems(userId),
    countCollections(userId),
  ]);
  return {
    itemCount,
    collectionCount,
    canCreateItem: isPro || itemCount < MAX_ITEMS,
    canCreateCollection: isPro || collectionCount < MAX_COLLECTIONS,
  };
}

/**
 * 快速判斷能否新增 item；Pro 直接回傳 true，不查資料庫。
 * 注意：這是 transaction 外的檢查，同時送出的請求可能都通過；
 * 實際擋下超額的是 createItemInDb 在 transaction 內的計數
 */
export async function canCreateItem(
  userId: string,
  isPro: boolean,
): Promise<boolean> {
  if (isPro) {
    return true;
  }
  return (await countItems(userId)) < MAX_ITEMS;
}

/** 同 canCreateItem；實際擋下超額的是 createCollectionInDb 在 transaction 內的計數 */
export async function canCreateCollection(
  userId: string,
  isPro: boolean,
): Promise<boolean> {
  if (isPro) {
    return true;
  }
  return (await countCollections(userId)) < MAX_COLLECTIONS;
}
