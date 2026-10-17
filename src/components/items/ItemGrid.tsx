import { ItemCard } from "@/components/dashboard/ItemCard";
import { ImageCard } from "@/components/items/ImageCard";
import { isImageMimeType } from "@/lib/file-types";
import type { ItemSummary } from "@/types/items";

/**
 * 型別與 collection 頁的卡片網格。欄數依頁面容器寬度（呼叫端要有 @container）：
 * 側邊欄佔去寬度時，視窗的 md 斷點會讓兩欄窄到無法閱讀
 */
export function ItemGrid({ items }: { items: ItemSummary[] }) {
  return (
    // 三欄從 @6xl 起：@5xl（1366px 視窗、側邊欄展開）時卡片只有約 340px，標題剩約 105px
    <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
      {items.map((item) =>
        // 卡片依檔案本身逐筆判斷，而非型別 slug
        item.file && isImageMimeType(item.file.mimeType) ? (
          <ImageCard key={item.id} item={item} />
        ) : (
          <ItemCard key={item.id} item={item} />
        ),
      )}
    </div>
  );
}
