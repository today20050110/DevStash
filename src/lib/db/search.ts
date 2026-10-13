/** command palette 的資料：進入 app 時一次載入，搜尋在用戶端進行 */
import { prisma } from "@/lib/prisma";
import { toSearchPreview } from "@/lib/search";
import type {
  SearchCollection,
  SearchData,
  SearchItem,
} from "@/types/search";

/**
 * 從資料庫取出的預覽長度：比顯示的上限長一些，壓掉空白後仍夠截斷。
 * content 最大 1 MB，只能在 SQL 裡截，不能整份載入
 */
const PREVIEW_SOURCE_LENGTH = 300;

interface SearchItemRow {
  id: string;
  title: string;
  typeName: string;
  typeIcon: string;
  typeColor: string;
  preview: string | null;
}

/**
 * 該使用者所有未刪除的 items，依建立時間由新到舊。Prisma 無法 select 子字串，
 * 所以用 $queryRaw 的 left()：預覽依序取 content、url、檔名的開頭
 */
async function getSearchItems(userId: string): Promise<SearchItem[]> {
  const rows = await prisma.$queryRaw<SearchItemRow[]>`
    SELECT
      i."id",
      i."title",
      t."name" AS "typeName",
      t."icon" AS "typeIcon",
      t."color" AS "typeColor",
      left(COALESCE(i."content", i."url", i."fileName"), ${PREVIEW_SOURCE_LENGTH}) AS "preview"
    FROM "Item" i
    JOIN "ItemType" t ON t."id" = i."itemTypeId"
    WHERE i."userId" = ${userId} AND i."deletedAt" IS NULL
    ORDER BY i."createdAt" DESC, i."id" DESC
  `;
  return rows.map(({ typeName, typeIcon, typeColor, preview, ...item }) => ({
    ...item,
    type: { name: typeName, icon: typeIcon, color: typeColor },
    preview: toSearchPreview(preview),
  }));
}

/**
 * 該使用者所有未刪除的 collections，依名稱排序。item 數以 _count 計算，
 * 不載入 items 本身；與卡片相同只算該使用者未刪除的 item
 */
async function getSearchCollections(
  userId: string,
): Promise<SearchCollection[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, deletedAt: null },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: {
      id: true,
      name: true,
      _count: {
        select: { items: { where: { item: { userId, deletedAt: null } } } },
      },
    },
  });
  return collections.map(({ _count, ...collection }) => ({
    ...collection,
    itemCount: _count.items,
  }));
}

export async function getSearchData(userId: string): Promise<SearchData> {
  const [items, collections] = await Promise.all([
    getSearchItems(userId),
    getSearchCollections(userId),
  ]);
  return { items, collections };
}
