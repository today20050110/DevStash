/** /favorites 頁的查詢：只取精簡列表需要的欄位，不載入卡片用的標籤與複製判斷 */
import { summarizeTypes } from "@/lib/db/collections";
import { prisma } from "@/lib/prisma";
import type { FavoriteCollection, FavoriteItem } from "@/types/favorites";

const TYPE_SELECT = { name: true, icon: true, color: true } as const;

/** 收藏的 items，依 updatedAt 由新到舊；同值時以 id 決定順序，重新整理後不會跳動 */
export async function listFavoriteItems(
  userId: string,
): Promise<FavoriteItem[]> {
  const items = await prisma.item.findMany({
    where: { isFavorite: true, userId, deletedAt: null },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      updatedAt: true,
      itemType: { select: TYPE_SELECT },
    },
  });
  return items.map(({ itemType, ...item }) => ({ ...item, type: itemType }));
}

/**
 * 收藏的 collections，依 updatedAt 由新到舊，附 item 數量與主要型別。
 * items 以關聯一次載入（不是每個 collection 各查一次），再在記憶體中彙總。
 */
export async function listFavoriteCollections(
  userId: string,
): Promise<FavoriteCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { isFavorite: true, userId, deletedAt: null },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      updatedAt: true,
      items: {
        // userId 也要限制：join table 本身不帶擁有者
        where: { item: { userId, deletedAt: null } },
        select: {
          item: {
            select: {
              itemType: { select: { id: true, slug: true, ...TYPE_SELECT } },
            },
          },
        },
      },
    },
  });

  return collections.map(({ items, ...collection }) => {
    const [main] = summarizeTypes(items.map(({ item }) => item.itemType));
    return {
      ...collection,
      itemCount: items.length,
      type: main
        ? { name: main.name, icon: main.icon, color: main.color }
        : null,
    };
  });
}
