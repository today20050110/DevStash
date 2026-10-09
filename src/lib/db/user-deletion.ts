import type { Prisma } from "@/generated/prisma/client";

/**
 * 硬刪除 item 之前呼叫：資料庫的刪除帶不走 R2 上的檔案，
 * 把符合條件且有 storageKey 的 item 寫入 PendingDeletion，交給 sweeper 清除。
 * 已軟刪除的 item 也包含在內——軟刪除時 R2 刪除失敗的物件仍需清理，重複刪除不會出錯。
 *
 * prisma/seed.ts 以相對路徑 import，這個檔案只能有型別層級的 @/ import。
 */
export async function queueFileDeletions(
  tx: Prisma.TransactionClient,
  where: Prisma.ItemWhereInput,
): Promise<void> {
  const fileItems = await tx.item.findMany({
    where: { ...where, storageKey: { not: null } },
    select: { storageKey: true },
  });
  await tx.pendingDeletion.createMany({
    data: fileItems.map((item) => ({ storageKey: item.storageKey! })),
  });
}

/**
 * 在呼叫端的 transaction 內刪除使用者與其全部內容：
 * Item（含 ItemCollection／ItemTag）、Collection、Tag、自訂 ItemType、AiUsage，
 * 以及經 onDelete: Cascade 帶走的 Account、Session。
 * 有 storageKey 的 item 寫入 PendingDeletion，交給 sweeper 清掉 R2 上的檔案。
 * VerificationToken 不以 userId 關聯，由呼叫端依 email 自行刪除。
 *
 * 帳號刪除（src/actions/profile.ts）與 scripts/prune-users.ts 共用，
 * 刪除順序只寫在這裡。
 */
export async function deleteUsersAndContent(
  tx: Prisma.TransactionClient,
  userIds: string[],
): Promise<void> {
  const owned = { userId: { in: userIds } };

  // Item.itemType 是 onDelete: Restrict：其他使用者的 item 若用到這些使用者的
  // 自訂型別，刪除型別會失敗，事先丟出明確的錯誤
  const blocking = await tx.item.count({
    where: { userId: { notIn: userIds }, itemType: owned },
  });
  if (blocking > 0) {
    throw new Error(
      `${blocking} item(s) owned by other users use these users' custom types`,
    );
  }

  await queueFileDeletions(tx, owned);

  // 先刪 item 再刪型別（Restrict），其餘由 onDelete: Cascade 帶走
  await tx.aiUsage.deleteMany({ where: owned });
  await tx.item.deleteMany({ where: owned });
  await tx.collection.deleteMany({ where: owned });
  await tx.tag.deleteMany({ where: owned });
  await tx.itemType.deleteMany({ where: owned });
  await tx.user.deleteMany({ where: { id: { in: userIds } } });
}
