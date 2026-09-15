import { prisma } from "@/lib/prisma";

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
