import type { ItemDetail } from "@/types/items";

/** drawer 與卡片快速複製用的完整資料（GET /api/items/[id]） */
export function itemApiUrl(id: string): string {
  return `/api/items/${encodeURIComponent(id)}`;
}

/** 檔案預覽與下載：驗證擁有者後由伺服器轉送，bucket 不公開 */
export function itemFileUrl(id: string): string {
  return `${itemApiUrl(id)}/file`;
}

/** JSON 裡的日期是字串，回到 client 後要轉回 Date */
type ItemDetailJson = Omit<
  ItemDetail,
  "pinnedAt" | "createdAt" | "updatedAt"
> & {
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

interface ItemDetailResponse {
  success: boolean;
  data?: ItemDetailJson;
  error?: string;
}

function parseItemDetail(json: ItemDetailJson): ItemDetail {
  return {
    ...json,
    pinnedAt: json.pinnedAt ? new Date(json.pinnedAt) : null,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
  };
}

/** 載入 item 的完整資料；失敗時以 API 回傳的訊息（或通用訊息）丟出 Error */
export async function fetchItemDetail(
  id: string,
  signal?: AbortSignal,
): Promise<ItemDetail> {
  const response = await fetch(itemApiUrl(id), { signal });
  // 非 JSON 的錯誤頁（例如平台層的 5xx）不讓 SyntaxError 的訊息顯示給使用者
  const body = (await response
    .json()
    .catch(() => null)) as ItemDetailResponse | null;
  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.error ?? "Failed to load item");
  }
  return parseItemDetail(body.data);
}
