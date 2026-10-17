import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleItemPin } from "@/actions/items";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

interface UseItemPinToggleOptions {
  itemId: string;
  /** 伺服器目前的狀態；router.refresh() 後由父層傳入新值 */
  isPinned: boolean;
  /** 成功後的額外處理，例如更新 drawer 內的 item */
  onSaved?: (pinnedAt: Date | null) => void;
}

/**
 * drawer 的釘選切換，與 useFavoriteToggle 相同的流程：先更新畫面再送出，
 * 失敗時還原並顯示錯誤；成功後 router.refresh()，讓 dashboard 的 Pinned 區塊與列表順序同步
 */
export function useItemPinToggle({
  itemId,
  isPinned,
  onSaved,
}: UseItemPinToggleOptions) {
  const router = useRouter();
  const [value, setValue] = useState(isPinned);
  // 父層傳入的值改變時以它為準；React 建議的 render 期間調整 state 寫法
  const [synced, setSynced] = useState(isPinned);
  if (isPinned !== synced) {
    setSynced(isPinned);
    setValue(isPinned);
  }
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const result = await callServerAction(() => toggleItemPin(itemId, next));
      if (!result?.success || !result.data) {
        setValue(!next);
        toast.error(
          result
            ? (result.error ?? "Failed to update pin")
            : SERVER_UNREACHABLE_MESSAGE,
        );
        return;
      }
      onSaved?.(result.data.pinnedAt);
      toast.success(next ? "Pinned" : "Unpinned");
      router.refresh();
    });
  }

  return { isPinned: value, isPending, toggle };
}
