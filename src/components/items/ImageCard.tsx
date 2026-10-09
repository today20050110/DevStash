import { Pin, Star } from "lucide-react";

import { ItemCardTrigger } from "@/components/items/ItemCardTrigger";
import { Card } from "@/components/ui/card";
import type { ItemSummary } from "@/types/items";

interface ImageCardProps {
  item: ItemSummary;
}

/** 型別列表頁的圖片縮圖卡片；點擊與 ItemCard 相同，開啟 item drawer */
export function ImageCard({ item }: ImageCardProps) {
  const src = `/api/items/${encodeURIComponent(item.id)}/file`;

  return (
    <Card className="relative gap-0 py-0 transition-colors hover:bg-muted/40">
      {/* 外層裁切放大後的圖片，避免溢出圓角 */}
      <div className="aspect-video overflow-hidden bg-muted">
        {/* 使用者上傳的檔案經驗證過的 API 讀取，next/image 的最佳化不適用；
            沒有另外產生縮圖，載入的是原圖，所以延後到捲到附近才載入 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-hover/card:scale-105 group-has-focus-visible/card:scale-105"
        />
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="truncate font-semibold">{item.title}</span>
        {item.pinnedAt && (
          <Pin className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        {item.isFavorite && (
          <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
        )}
      </div>
      {/* 放在最後：放大中的圖片（scale）會被提升到定位層，按鈕在前面時會被圖片蓋住而點不到 */}
      <ItemCardTrigger id={item.id} title={item.title} />
    </Card>
  );
}
