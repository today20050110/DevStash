import { Pin } from "lucide-react";

import type { ItemSummary } from "@/types/items";

/**
 * 卡片標題旁的釘選狀態圖示；ItemCard 與 ImageCard 共用。
 * 收藏狀態改由卡片上可點的 FavoriteButton 顯示，這裡不再重複一顆星
 */
export function ItemStatusIcons({
  item,
}: {
  item: Pick<ItemSummary, "pinnedAt">;
}) {
  return (
    item.pinnedAt && <Pin className="size-3.5 shrink-0 text-muted-foreground" />
  );
}
