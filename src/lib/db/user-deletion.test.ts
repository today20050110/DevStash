import { describe, expect, it, vi } from "vitest";

import { queueFileDeletions } from "@/lib/db/user-deletion";

function createTx(storageKeys: string[]) {
  return {
    item: {
      findMany: vi
        .fn()
        .mockResolvedValue(storageKeys.map((storageKey) => ({ storageKey }))),
    },
    pendingDeletion: { createMany: vi.fn() },
  };
}

describe("queueFileDeletions", () => {
  it("只查有 storageKey 的 item，並把 key 寫入 PendingDeletion", async () => {
    const tx = createTx(["users/u1/items/a.png", "users/u1/items/b.pdf"]);

    await queueFileDeletions(tx as never, { userId: "u1" });

    expect(tx.item.findMany).toHaveBeenCalledWith({
      where: { userId: "u1", storageKey: { not: null } },
      select: { storageKey: true },
    });
    expect(tx.pendingDeletion.createMany).toHaveBeenCalledWith({
      data: [
        { storageKey: "users/u1/items/a.png" },
        { storageKey: "users/u1/items/b.pdf" },
      ],
    });
  });

  it("沒有檔案時寫入空陣列，不影響後續刪除", async () => {
    const tx = createTx([]);

    await queueFileDeletions(tx as never, { userId: { in: ["u1", "u2"] } });

    expect(tx.pendingDeletion.createMany).toHaveBeenCalledWith({ data: [] });
  });
});
