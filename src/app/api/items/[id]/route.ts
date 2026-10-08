import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/current-user";
import { getItemDetail } from "@/lib/db/items";
import type { ItemDetail } from "@/types/items";

interface ItemDetailResponse {
  success: boolean;
  data?: ItemDetail;
  error?: string;
}

function errorResponse(error: string, status: number) {
  return NextResponse.json<ItemDetailResponse>(
    { success: false, error },
    { status },
  );
}

/** drawer 點擊卡片時載入完整資料。proxy 不涵蓋 /api，這裡自行驗證登入 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/items/[id]">,
) {
  // getCurrentUserId() 回查資料庫並比對 sessionVersion，舊 token 一律視為未登入
  const userId = await getCurrentUserId();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { id } = await params;
  try {
    const item = await getItemDetail(userId, id);
    // 別人的 item 與不存在的 item 一樣回 404
    if (!item) {
      return errorResponse("Item not found", 404);
    }
    return NextResponse.json<ItemDetailResponse>({ success: true, data: item });
  } catch (error) {
    console.error("Failed to load item", error);
    return errorResponse("Failed to load item", 500);
  }
}
