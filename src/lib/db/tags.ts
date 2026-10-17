/** 標籤的讀取查詢；標籤的建立與連結在 item-mutations.ts（隨 item 存檔） */
import { prisma } from "@/lib/prisma";
import type { TagSummary } from "@/types/tags";

/** 只有該使用者的標籤；別人的或不存在的 slug 回傳 null，呼叫端當作 404 */
export function getTagBySlug(userId: string, slug: string) {
  return prisma.tag.findUnique({
    where: { userId_slug: { userId, slug } },
    select: { id: true, name: true, slug: true },
  });
}

/**
 * 至少被一個未刪除 item 使用的標籤與數量，依數量、再依名稱排序。
 * Prisma 無法依「帶條件的關聯計數」排序，所以查完在記憶體裡排；
 * 單一使用者的標籤數量不大，一次查詢即可
 */
export async function getTagsWithCounts(userId: string): Promise<TagSummary[]> {
  const activeItems = { item: { userId, deletedAt: null } };
  const tags = await prisma.tag.findMany({
    where: { userId, items: { some: activeItems } },
    select: {
      name: true,
      slug: true,
      _count: { select: { items: { where: activeItems } } },
    },
  });

  return tags
    .map(({ name, slug, _count }) => ({ name, slug, itemCount: _count.items }))
    .sort(
      (a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name),
    );
}
