import { NextResponse } from "next/server";

/** API route 的回應格式，與 server action 的 { success, data, error } 一致 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 失敗回應；429 等需要 Retry-After 時由 headers 帶入 */
export function apiError(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, error },
    { status, headers },
  );
}
