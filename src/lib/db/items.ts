import type { Prisma } from "@/generated/prisma/client";
import { getItemTypeFields } from "@/lib/item-fields";
import type { CreateItemData, UpdateItemData } from "@/lib/item-schemas";
import { prisma } from "@/lib/prisma";
import { dedupeTagNames, toTagSlug } from "@/lib/tags";
import type {
  CreatableItemType,
  ItemDetail,
  ItemFile,
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
      storageKey: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      itemType: { select: { name: true, icon: true, color: true } },
      tags: {
        // tag.userId 也要限制：join table 本身不帶擁有者
        where: { tag: { userId } },
        orderBy: { tag: { name: "asc" } },
        select: { tag: { select: { name: true } } },
      },
    },
  });

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
      tags: tags.map(({ tag }) => tag.name),
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
    tags: tags.map(({ tag }) => tag.name),
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
 * 擁有者與「尚未刪除」放在 updateMany 的條件裡，以它的 count 為準；先讀出的 storageKey
 * 交給呼叫端刪除 R2 物件。回傳 null 代表不存在、屬於別人或已經刪除過。
 */
export async function softDeleteItem(
  userId: string,
  itemId: string,
): Promise<{ storageKey: string | null } | null> {
  const where = { id: itemId, userId, deletedAt: null };
  const item = await prisma.item.findFirst({
    where,
    select: { storageKey: true },
  });
  if (!item) {
    return null;
  }
  const { count } = await prisma.item.updateMany({
    where,
    data: { deletedAt: new Date() },
  });
  return count > 0 ? item : null;
}

/** R2 物件刪除失敗時記下來，留給日後的 sweeper 重試（§3.3） */
export async function recordPendingDeletion(
  storageKey: string,
  error: unknown,
): Promise<void> {
  await prisma.pendingDeletion.create({
    data: {
      storageKey,
      attempts: 1,
      lastError: error instanceof Error ? error.message : String(error),
    },
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

/** 已上傳到 R2 並由 action 以 HeadObject 確認過的檔案 */
export interface NewItemFile {
  storageKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export type CreateItemResult =
  | { status: "created"; item: { id: string; title: string } }
  | { status: "limit-reached"; limit: number }
  | { status: "file-in-use" };

/**
 * 在 transaction 內檢查額度並建立 item（§4.1、§6）。itemLimit 為 null 代表不限。
 * 先取得以 userId 為鍵的 advisory lock：同一使用者同時送出兩個請求時，
 * 第二個要等第一個 commit 後才計數，不會兩個都以 49 筆通過檢查。
 * 不屬於該型別的欄位不寫入，與 updateItem 相同。
 * 檔案的 key 已被其他 item 使用時回傳 file-in-use，不建立。
 */
export async function createItem(
  userId: string,
  itemType: Pick<CreatableItemType, "id" | "kind" | "slug">,
  data: Omit<CreateItemData, "itemTypeId" | "storageKey" | "fileName">,
  itemLimit: number | null,
  file: NewItemFile | null = null,
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
    // action 已先檢查過一次；這裡在 lock 內再查，同一個 key 同時送出兩次時只有一個能建立
    // （key 一定屬於同一個使用者，per-user lock 足以把兩個請求排成先後）
    if (
      file &&
      (await tx.item.findFirst({
        where: { userId, storageKey: file.storageKey },
        select: { id: true },
      }))
    ) {
      return { status: "file-in-use" } as const;
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
        ...(fields.file &&
          file && {
            storageKey: file.storageKey,
            fileName: file.fileName,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
          }),
        tags: {
          create: tagIds.map((tagId) => ({ tagId, source: "USER" })),
        },
      },
      select: { id: true, title: true },
    });
    return { status: "created", item } as const;
  });
}
