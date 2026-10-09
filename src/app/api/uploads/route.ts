import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, type ApiResponse } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/current-user";
import {
  checkRateLimit,
  rateLimitMessage,
  retryAfterSeconds,
} from "@/lib/rate-limit";
import { prepareUpload, type PrepareUploadResult } from "@/lib/uploads";

type UploadResponse = ApiResponse<{
  uploadUrl: string;
  storageKey: string;
  mimeType: string;
}>;

const uploadRequestSchema = z.object({
  itemTypeId: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  size: z.number().int().positive(),
});

const STATUS_BY_REASON: Record<
  Extract<PrepareUploadResult, { ok: false }>["reason"],
  number
> = {
  "invalid-type": 400,
  "invalid-file": 400,
  "pro-required": 403,
  "limit-reached": 402,
};

/**
 * 簽發上傳網址；檔案由瀏覽器直接 PUT 到 R2，不經過這裡（Vercel 函式的 request body
 * 上限 4.5 MB）。上傳完成後由 createItem action 以 HeadObject 確認再建立 item。
 * proxy 不涵蓋 /api，這裡自行驗證登入。
 */
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError("Unauthorized", 401);
  }
  const limit = await checkRateLimit("uploadFile", userId);
  if (!limit.success) {
    return apiError(rateLimitMessage(limit.reset), 429, {
      "Retry-After": String(retryAfterSeconds(limit.reset)),
    });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid upload request", 400);
  }

  try {
    const result = await prepareUpload(userId, parsed.data);
    if (!result.ok) {
      return apiError(result.error, STATUS_BY_REASON[result.reason]);
    }
    const { uploadUrl, storageKey, mimeType } = result;
    return NextResponse.json<UploadResponse>({
      success: true,
      data: { uploadUrl, storageKey, mimeType },
    });
  } catch (error) {
    console.error("Failed to prepare upload", error);
    return apiError("Failed to prepare upload", 500);
  }
}
