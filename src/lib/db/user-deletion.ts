import type { Prisma } from "@/generated/prisma/client";

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

  const fileItems = await tx.item.findMany({
    where: { ...owned, storageKey: { not: null } },
    select: { storageKey: true },
  });
  await tx.pendingDeletion.createMany({
    data: fileItems.map((item) => ({ storageKey: item.storageKey! })),
  });

  // 先刪 item 再刪型別（Restrict），其餘由 onDelete: Cascade 帶走
  await tx.aiUsage.deleteMany({ where: owned });
  await tx.item.deleteMany({ where: owned });
  await tx.collection.deleteMany({ where: owned });
  await tx.tag.deleteMany({ where: owned });
  await tx.itemType.deleteMany({ where: owned });
  await tx.user.deleteMany({ where: { id: { in: userIds } } });
}
