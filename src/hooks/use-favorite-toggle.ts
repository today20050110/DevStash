import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";
import type { FavoriteResult } from "@/types/favorites";

interface UseFavoriteToggleOptions {
  /** 伺服器目前的狀態；router.refresh() 後由父層傳入新值 */
  isFavorite: boolean;
  /** 寫入目標值的 server action（setItemFavorite／setCollectionFavorite 綁好 id） */
  save: (isFavorite: boolean) => Promise<FavoriteResult>;
  /** 成功後的額外處理，例如更新 drawer 內的 item */
  onSaved?: (isFavorite: boolean) => void;
}

/**
 * drawer、卡片、collection 頁與卡片選單共用的收藏切換：先更新畫面再送出，
 * 失敗時還原並顯示錯誤；成功後 router.refresh()，讓側邊欄、統計與其他列表同步
 */
export function useFavoriteToggle({
  isFavorite,
  save,
  onSaved,
}: UseFavoriteToggleOptions) {
  const router = useRouter();
  const [value, setValue] = useState(isFavorite);
  // 父層傳入的值改變（refresh 後、或別處切換過）時以它為準；React 建議的 render 期間調整 state 寫法
  const [synced, setSynced] = useState(isFavorite);
  if (isFavorite !== synced) {
    setSynced(isFavorite);
    setValue(isFavorite);
  }
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const result = await callServerAction(() => save(next));
      if (!result?.success) {
        setValue(!next);
        toast.error(
          result
            ? (result.error ?? "Failed to update favorite")
            : SERVER_UNREACHABLE_MESSAGE,
        );
        return;
      }
      onSaved?.(next);
      toast.success(next ? "Added to favorites" : "Removed from favorites");
      router.refresh();
    });
  }

  return { isFavorite: value, isPending, toggle };
}
