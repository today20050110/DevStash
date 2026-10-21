import type { AiFeature } from "@/generated/prisma/client";
import type { AiTokenUsage } from "@/lib/openai";
import { AI_USAGE_WINDOW_MS } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export type AiReservation =
  | { status: "reserved"; id: string }
  | { status: "limit-reached"; resetAt: Date };

function windowStart(now: Date): Date {
  return new Date(now.getTime() - AI_USAGE_WINDOW_MS);
}

/** 過去 24 小時的 AI 呼叫次數（含尚未完成、tokens 仍為 0 的佔位） */
export function countRecentAiUsage(
  userId: string,
  now = new Date(),
): Promise<number> {
  return prisma.aiUsage.count({
    where: { userId, createdAt: { gte: windowStart(now) } },
  });
}

/**
 * 呼叫 OpenAI 前先插入一筆佔住額度，再計算窗口內的筆數；超過上限就刪除自己這筆並回報。
 * 先插入再計數：同時送出的請求各自都看得到彼此，不會一起擠進最後一個名額（最壞情況是兩個都被擋，偏保守）。
 * 被擋時回傳窗口內最早一筆滿 24 小時的時刻，那時會空出一個名額
 */
export async function reserveAiUsage(
  userId: string,
  feature: AiFeature,
  limit: number,
  now = new Date(),
): Promise<AiReservation> {
  const { id } = await prisma.aiUsage.create({
    data: { userId, feature },
    select: { id: true },
  });
  const count = await countRecentAiUsage(userId, now);
  if (count <= limit) {
    return { status: "reserved", id };
  }

  await releaseAiUsage(userId, id);
  const oldest = await prisma.aiUsage.findFirst({
    where: { userId, createdAt: { gte: windowStart(now) } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  const resetAt = new Date(
    (oldest?.createdAt ?? now).getTime() + AI_USAGE_WINDOW_MS,
  );
  return { status: "limit-reached", resetAt };
}

/** 呼叫成功後補上 token 數；以 userId 一併限制，只能改自己的紀錄 */
export async function completeAiUsage(
  userId: string,
  id: string,
  usage: AiTokenUsage,
): Promise<void> {
  await prisma.aiUsage.updateMany({ where: { id, userId }, data: usage });
}

/** 呼叫失敗時刪除佔位，失敗的請求不吃額度 */
export async function releaseAiUsage(userId: string, id: string): Promise<void> {
  await prisma.aiUsage.deleteMany({ where: { id, userId } });
}
