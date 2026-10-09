import { useCallback, useEffect, useState } from "react";

import { fetchItemDetail } from "@/lib/item-api";
import type { ItemDetail } from "@/types/items";

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
  /** 儲存後以 server action 回傳的資料更新 drawer，不必再載入一次 */
  replaceItem: (item: ItemDetail) => void;
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

  const replaceItem = useCallback(
    (item: ItemDetail) => {
      if (key !== undefined) {
        setResult({ key, item, error: null });
      }
    },
    [key],
  );

  if (key === undefined || result?.key !== key) {
    return {
      item: null,
      error: null,
      isLoading: key !== undefined,
      replaceItem,
    };
  }
  return {
    item: result.item,
    error: result.error,
    isLoading: false,
    replaceItem,
  };
}
