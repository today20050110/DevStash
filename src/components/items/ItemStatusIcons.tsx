import { Pin, Star } from "lucide-react";

import type { ItemSummary } from "@/types/items";

/** 卡片標題旁的釘選與收藏狀態圖示；ItemCard 與 ImageCard 共用 */
export function ItemStatusIcons({
  item,
}: {
  item: Pick<ItemSummary, "pinnedAt" | "isFavorite">;
}) {
  return (
    <>
      {item.pinnedAt && (
        <Pin className="size-3.5 shrink-0 text-muted-foreground" />
      )}
      {item.isFavorite && (
        <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
      )}
    </>
  );
}
