import { useEffect, useState } from "react";

import type { ItemDetail } from "@/types/items";

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

/** 結果帶著 request 的 key：開啟新的 request 時舊結果自然不符而視為載入中，不需在 effect 內同步重設 state */
interface ItemDetailResult {
  key: number;
  item: ItemDetail | null;
  error: string | null;
}

interface ItemDetailState {
  item: ItemDetail | null;
  error: string | null;
  isLoading: boolean;
}

function parseItemDetail(json: ItemDetailJson): ItemDetail {
  return {
    ...json,
    pinnedAt: json.pinnedAt ? new Date(json.pinnedAt) : null,
    createdAt: new Date(json.createdAt),
    updatedAt: new Date(json.updatedAt),
  };
}

async function fetchItemDetail(
  id: string,
  signal: AbortSignal,
): Promise<ItemDetail> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`, {
    signal,
  });
  // 非 JSON 的錯誤頁（例如平台層的 5xx）不讓 SyntaxError 的訊息顯示給使用者
  const body = (await response
    .json()
    .catch(() => null)) as ItemDetailResponse | null;
  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.error ?? "Failed to load item");
  }
  return parseItemDetail(body.data);
}

/** 每次開啟都是新的 request（key 遞增），同一個 item 再開一次也會重新載入，失敗後可重試 */
export interface ItemDetailRequest {
  id: string;
  key: number;
}

/** 點擊卡片時才載入完整資料；快速切換時中止前一個請求，避免舊回應蓋掉新的 */
export function useItemDetail(
  request: ItemDetailRequest | null,
): ItemDetailState {
  const [result, setResult] = useState<ItemDetailResult | null>(null);
  const id = request?.id;
  const key = request?.key;

  useEffect(() => {
    if (id === undefined || key === undefined) {
      return;
    }
    const controller = new AbortController();
    fetchItemDetail(id, controller.signal)
      .then((item) => setResult({ key, item, error: null }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        const message =
          error instanceof Error ? error.message : "Failed to load item";
        setResult({ key, item: null, error: message });
      });
    return () => controller.abort();
  }, [id, key]);

  if (key === undefined || result?.key !== key) {
    return { item: null, error: null, isLoading: key !== undefined };
  }
  return { item: result.item, error: result.error, isLoading: false };
}
