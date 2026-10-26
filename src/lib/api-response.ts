import { NextResponse } from "next/server";

import type { ActionResult } from "@/types/action";

/** API route 的回應格式，與 server action 共用同一個定義 */
export type ApiResponse<T> = ActionResult<T>;

/** 失敗回應；429 等需要 Retry-After 時由 headers 帶入 */
export function apiError(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status, headers },
  );
}
