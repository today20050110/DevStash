/** item 的讀取查詢（卡片列表、drawer、下載代理）；寫入在 item-mutations.ts，型別在 item-types.ts */
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ItemDetail, ItemFile, ItemSummary } from "@/types/items";

const RECENT_ITEMS_LIMIT = 10;
const PINNED_ITEMS_LIMIT = 10;

/** 未刪除的 item 數量，額度檢查用；不像 getItemCounts 多算一次收藏數 */
export function countActiveItems(userId: string): Promise<number> {
  return prisma.item.count({ where: { userId, deletedAt: null } });
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

/**
 * 卡片與 drawer 共用的標籤查詢：依名稱排序、只取名稱。
 * tag.userId 也要限制——join table 本身不帶擁有者
 */
function ownedTagNames(userId: string) {
  return {
    where: { tag: { userId } },
    orderBy: { tag: { name: "asc" } },
    select: { tag: { select: { name: true } } },
  } satisfies Prisma.ItemTagFindManyArgs;
}

function toTagNames(tags: { tag: { name: string } }[]): string[] {
  return tags.map(({ tag }) => tag.name);
}

interface ItemSummaryQuery {
  where?: Prisma.ItemWhereInput;
  orderBy: Prisma.ItemOrderByWithRelationInput;
  take?: number;
}

const NON_EMPTY: Prisma.StringNullableFilter<"Item"> = {
  not: null,
  notIn: [""],
};

/**
 * 有 content 或 url 可複製的 item（卡片的複製按鈕依此顯示）。列表刻意不載入
 * content（可能很大），Prisma 又無法 select 計算欄位，所以另以一次只回傳 id 的
 * 查詢判斷；整個列表只多一次查詢，不是每張卡片一次
 */
async function findCopyableItemIds(
  userId: string,
  ids: string[],
): Promise<Set<string>> {
  if (ids.length === 0) {
    return new Set();
  }
  const rows = await prisma.item.findMany({
    where: {
      id: { in: ids },
      userId,
      OR: [{ content: NON_EMPTY }, { url: NON_EMPTY }],
    },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

/**
 * 卡片用的 item 查詢。型別與標籤隨 item 一次載入，不是每張卡片各查一次。
 * userId 與 deletedAt 放在最後，呼叫端傳入的條件無法覆寫。
 */
async function findItemSummaries(
  userId: string,
  { where, orderBy, take }: ItemSummaryQuery,
): Promise<ItemSummary[]> {
  const owned = { userId, deletedAt: null };
  const items = await prisma.item.findMany({
    where: { ...where, ...owned },
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
      storageKey: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      itemType: { select: { name: true, icon: true, color: true } },
      tags: ownedTagNames(userId),
    },
  });

  const copyable = await findCopyableItemIds(
    userId,
    items.map((item) => item.id),
  );

  return items.map(
    ({
      itemType,
      tags,
      storageKey,
      fileName,
      fileSize,
      mimeType,
      ...item
    }) => ({
      ...item,
      type: itemType,
      tags: toTagNames(tags),
      hasCopyValue: copyable.has(item.id),
      // storageKey 只用來判斷有沒有檔案，不送到前端
      file: storageKey ? toItemFile({ fileName, fileSize, mimeType }) : null,
    }),
  );
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
      storageKey: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      itemType: {
        select: { name: true, icon: true, color: true, kind: true, slug: true },
      },
      // join table 本身不帶擁有者，collection 也要另外限制 userId
      tags: ownedTagNames(userId),
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

  const {
    itemType,
    tags,
    collections,
    storageKey,
    fileName,
    fileSize,
    mimeType,
    ...rest
  } = item;
  return {
    ...rest,
    // storageKey 只在伺服器端使用，不送到前端；檔案一律經 /api/items/[id]/file 讀取
    file: storageKey ? toItemFile({ fileName, fileSize, mimeType }) : null,
    type: itemType,
    tags: toTagNames(tags),
    collections: collections.map(({ collection }) => collection),
  };
}

function toItemFile(file: {
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
}): ItemFile {
  return {
    name: file.fileName ?? "file",
    size: file.fileSize ?? 0,
    mimeType: file.mimeType ?? "application/octet-stream",
  };
}

/** 下載代理用：檔案的 key 與資料庫記錄的中繼資料；不存在、屬於別人或已刪除時回傳 null */
export async function getItemFile(
  userId: string,
  id: string,
): Promise<(ItemFile & { storageKey: string }) | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId, deletedAt: null, storageKey: { not: null } },
    select: {
      storageKey: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
    },
  });
  if (!item?.storageKey) {
    return null;
  }
  return { ...toItemFile(item), storageKey: item.storageKey };
}

/**
 * 同一個上傳只能建立一個 item：已被任何 item（含已刪除）使用的 key 不能再用。
 * key 內含 userId 且呼叫端已以 isOwnStorageKey 確認，帶上 userId 語意不變，
 * 又能用到以 userId 開頭的索引，不必掃描所有使用者的 item
 */
export async function isStorageKeyInUse(
  userId: string,
  storageKey: string,
): Promise<boolean> {
  const item = await prisma.item.findFirst({
    where: { userId, storageKey },
    select: { id: true },
  });
  return item !== null;
}
