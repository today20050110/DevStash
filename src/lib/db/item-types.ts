/**
 * 型別相關的查詢：系統型別（含數量）、依 slug 查型別、新增 item 時可選的型別。
 * item 的讀取在 items.ts，寫入在 item-mutations.ts。
 */
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type {
  CreatableItemType,
  ItemTypeDetail,
  ItemTypeWithCount,
} from "@/types/items";

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

/**
 * 系統型別不屬於任何使用者、不含使用者資料，沒有目前使用者時也能查詢。
 * 以 cache() 包起來：同一個請求內 layout、側邊欄與頁面各自呼叫時只查一次
 */
export const getSystemItemTypes = cache(async (): Promise<SystemItemType[]> => {
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
});

/**
 * 系統型別與該使用者在各型別下的 item 數量。
 * 數量以一次 groupBy 計算，不是每個型別各查一次；沒有 item 的型別數量為 0。
 * 側邊欄與 /profile 在同一個請求內都會呼叫，以 cache() 去重。
 */
export const getSystemItemTypesWithCounts = cache(
  async (userId: string): Promise<ItemTypeWithCount[]> => {
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
  },
);

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

const CREATABLE_TYPE_SELECT = {
  id: true,
  name: true,
  slug: true,
  icon: true,
  color: true,
  kind: true,
} as const;

/**
 * 新增 item 時可選的型別：系統型別，不能上傳檔案的方案（canUploadFiles）排除 FILE kind。
 * 自訂型別尚未實作，日後在此加入該使用者的型別。
 */
export async function getCreatableItemTypes(
  includeFileTypes: boolean,
): Promise<CreatableItemType[]> {
  const types = await prisma.itemType.findMany({
    where: {
      isSystem: true,
      userId: null,
      ...(!includeFileTypes && { kind: { not: "FILE" as const } }),
    },
    select: CREATABLE_TYPE_SELECT,
  });
  return types.sort((a, b) => typeOrder(a.slug) - typeOrder(b.slug));
}

/**
 * 系統型別或自己的自訂型別；別人的自訂型別一律查不到。
 * FILE kind 是否能使用由呼叫端以 canUploadFiles 判斷。
 */
export function findCreatableItemType(
  userId: string,
  itemTypeId: string,
): Promise<CreatableItemType | null> {
  return prisma.itemType.findFirst({
    where: {
      id: itemTypeId,
      OR: [{ isSystem: true, userId: null }, { userId }],
    },
    select: CREATABLE_TYPE_SELECT,
  });
}
