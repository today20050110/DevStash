import type { Prisma } from "@/generated/prisma/client";
import { getItemTypeFields } from "@/lib/item-fields";
import type { CreateItemData, UpdateItemData } from "@/lib/item-schemas";
import { prisma } from "@/lib/prisma";
import { dedupeTagNames, toTagSlug } from "@/lib/tags";
import type {
  CreatableItemType,
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
      itemType: {
        select: { name: true, icon: true, color: true, kind: true, slug: true },
      },
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

/**
 * 更新 item 的可編輯欄位並整批替換標籤，回傳更新後的完整資料。
 * 不屬於該使用者或已刪除時回傳 null（與 getItemDetail 相同，不區分兩者）。
 * 不屬於該型別的欄位（例如替 snippet 寫入 url）直接忽略，不寫入資料庫。
 */
export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateItemData,
): Promise<ItemDetail | null> {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.item.findFirst({
      where: { id: itemId, userId, deletedAt: null },
      select: { itemType: { select: { kind: true, slug: true } } },
    });
    if (!existing) {
      return false;
    }

    const fields = getItemTypeFields(existing.itemType);
    const tagIds = await upsertTags(tx, userId, data.tags);
    await tx.item.update({
      where: { id: itemId },
      data: {
        title: data.title,
        description: data.description,
        ...(fields.content && { content: data.content }),
        ...(fields.language && { language: data.language }),
        ...(fields.url && { url: data.url }),
        // 先移除所有標籤再連上新的；不再使用的 Tag 保留，之後做標籤管理時處理
        tags: {
          deleteMany: {},
          create: tagIds.map((tagId) => ({ tagId, source: "USER" })),
        },
      },
    });
    return true;
  });

  return updated ? getItemDetail(userId, itemId) : null;
}

/** 依 slug 找到或建立該使用者的標籤；slug 相同的名稱只算一個 */
async function upsertTags(
  tx: Prisma.TransactionClient,
  userId: string,
  names: string[],
): Promise<string[]> {
  const tagIds: string[] = [];
  for (const name of dedupeTagNames(names)) {
    const slug = toTagSlug(name);
    const tag = await tx.tag.upsert({
      where: { userId_slug: { userId, slug } },
      update: {},
      create: { userId, name, slug },
      select: { id: true },
    });
    tagIds.push(tag.id);
  }
  return tagIds;
}

/**
 * 軟刪除：只設定 deletedAt，資料列與標籤、collection 關聯都保留（誤刪時可從資料庫還原，
 * 也不再佔 free tier 額度）。所有讀取查詢都已排除 deletedAt 不為 null 的資料列。
 * 擁有者與「尚未刪除」放在同一個 updateMany 條件裡，一次查詢完成，不需要 transaction。
 * 回傳 false 代表不存在、屬於別人或已經刪除過。
 */
export async function softDeleteItem(
  userId: string,
  itemId: string,
): Promise<boolean> {
  const { count } = await prisma.item.updateMany({
    where: { id: itemId, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count > 0;
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
 * 新增 item 時可選的型別：系統型別中不需上傳檔案的（FILE kind 要等 R2 上傳完成）。
 * 自訂型別尚未實作，日後在此加入該使用者的型別。
 */
export async function getCreatableItemTypes(): Promise<CreatableItemType[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true, userId: null, kind: { not: "FILE" } },
    select: CREATABLE_TYPE_SELECT,
  });
  return types.sort((a, b) => typeOrder(a.slug) - typeOrder(b.slug));
}

/** 與 getCreatableItemTypes 同樣的條件；別人的自訂型別與 FILE kind 一律查不到 */
export function findCreatableItemType(
  userId: string,
  itemTypeId: string,
): Promise<CreatableItemType | null> {
  return prisma.itemType.findFirst({
    where: {
      id: itemTypeId,
      kind: { not: "FILE" },
      OR: [{ isSystem: true, userId: null }, { userId }],
    },
    select: CREATABLE_TYPE_SELECT,
  });
}

export type CreateItemResult =
  | { status: "created"; item: { id: string; title: string } }
  | { status: "limit-reached"; limit: number };

/**
 * 在 transaction 內檢查額度並建立 item（§4.1、§6）。itemLimit 為 null 代表不限。
 * 先取得以 userId 為鍵的 advisory lock：同一使用者同時送出兩個請求時，
 * 第二個要等第一個 commit 後才計數，不會兩個都以 49 筆通過檢查。
 * 不屬於該型別的欄位不寫入，與 updateItem 相同。
 */
export async function createItem(
  userId: string,
  itemType: Pick<CreatableItemType, "id" | "kind" | "slug">,
  data: Omit<CreateItemData, "itemTypeId">,
  itemLimit: number | null,
): Promise<CreateItemResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    if (itemLimit !== null) {
      const count = await tx.item.count({
        where: { userId, deletedAt: null },
      });
      if (count >= itemLimit) {
        return { status: "limit-reached", limit: itemLimit } as const;
      }
    }

    const fields = getItemTypeFields(itemType);
    const tagIds = await upsertTags(tx, userId, data.tags);
    const item = await tx.item.create({
      data: {
        userId,
        itemTypeId: itemType.id,
        title: data.title,
        description: data.description,
        ...(fields.content && { content: data.content }),
        ...(fields.language && { language: data.language }),
        ...(fields.url && { url: data.url }),
        tags: {
          create: tagIds.map((tagId) => ({ tagId, source: "USER" })),
        },
      },
      select: { id: true, title: true },
    });
    return { status: "created", item } as const;
  });
}
