/** item 的寫入：新增、編輯（含標籤）、軟刪除與待刪除檔案的紀錄 */
import type { Prisma } from "@/generated/prisma/client";
import { getItemDetail } from "@/lib/db/items";
import { getItemTypeFields } from "@/lib/item-fields";
import type { CreateItemData, UpdateItemData } from "@/lib/item-schemas";
import { prisma } from "@/lib/prisma";
import { dedupeTagNames, toTagSlug } from "@/lib/tags";
import type { CreatableItemType, ItemDetail } from "@/types/items";

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
