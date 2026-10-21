import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  completeAiUsage,
  countRecentAiUsage,
  releaseAiUsage,
  reserveAiUsage,
} from "@/lib/db/ai-usage";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsage: {
      create: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const create = vi.mocked(prisma.aiUsage.create);
const count = vi.mocked(prisma.aiUsage.count);
const findFirst = vi.mocked(prisma.aiUsage.findFirst);
const updateMany = vi.mocked(prisma.aiUsage.updateMany);
const deleteMany = vi.mocked(prisma.aiUsage.deleteMany);

const NOW = new Date("2026-10-22T12:00:00Z");
const DAY_AGO = new Date("2026-10-21T12:00:00Z");

beforeEach(() => {
  create.mockResolvedValue({ id: "usage-new" } as never);
  deleteMany.mockResolvedValue({ count: 1 });
});

describe("countRecentAiUsage", () => {
  it("只計算這個使用者過去 24 小時的紀錄", async () => {
    count.mockResolvedValue(7);
    await expect(countRecentAiUsage("user-1", NOW)).resolves.toBe(7);
    expect(count).toHaveBeenCalledWith({
      where: { userId: "user-1", createdAt: { gte: DAY_AGO } },
    });
  });
});

describe("reserveAiUsage", () => {
  it("先插入再計數，未超過上限時保留這筆", async () => {
    count.mockResolvedValue(50);
    await expect(
      reserveAiUsage("user-1", "AUTO_TAG", 50, NOW),
    ).resolves.toEqual({ status: "reserved", id: "usage-new" });
    expect(create).toHaveBeenCalledWith({
      data: { userId: "user-1", feature: "AUTO_TAG" },
      select: { id: true },
    });
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(
      count.mock.invocationCallOrder[0],
    );
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("超過上限時刪除自己這筆，回傳最早一筆滿 24 小時的時刻", async () => {
    count.mockResolvedValue(51);
    findFirst.mockResolvedValue({
      createdAt: new Date("2026-10-22T03:30:00Z"),
    } as never);
    await expect(
      reserveAiUsage("user-1", "SUMMARIZE", 50, NOW),
    ).resolves.toEqual({
      status: "limit-reached",
      resetAt: new Date("2026-10-23T03:30:00Z"),
    });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "usage-new", userId: "user-1" },
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", createdAt: { gte: DAY_AGO } },
        orderBy: { createdAt: "asc" },
      }),
    );
  });
});

describe("completeAiUsage／releaseAiUsage", () => {
  it("以 id 與 userId 一起限制，只能改自己的紀錄", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    await completeAiUsage("user-1", "usage-1", {
      inputTokens: 100,
      outputTokens: 20,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "usage-1", userId: "user-1" },
      data: { inputTokens: 100, outputTokens: 20 },
    });

    await releaseAiUsage("user-1", "usage-1");
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: "usage-1", userId: "user-1" },
    });
  });
});
