import { TypeIconTile } from "@/components/dashboard/TypeIconTile";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { CopyItemButton } from "@/components/items/CopyItemButton";
import { ItemCardTrigger } from "@/components/items/ItemCardTrigger";
import { ItemStatusIcons } from "@/components/items/ItemStatusIcons";
import { TagLink } from "@/components/items/TagLink";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { ItemSummary } from "@/types/items";

interface ItemCardProps {
  item: ItemSummary;
}

/**
 * 上方一列放圖示、標題、日期與按鈕，描述與標籤在下方使用整張卡片的寬度。
 * 若全部放在同一列，固定寬度的日期與按鈕會把文字擠成約 100px 寬的一欄
 */
export function ItemCard({ item }: ItemCardProps) {
  const { color, icon } = item.type;

  return (
    <Card
      className="relative border-l-4 transition-colors hover:bg-muted/40"
      style={{ borderLeftColor: color }}
    >
      <ItemCardTrigger id={item.id} title={item.title} />
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <TypeIconTile icon={icon} color={color} />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="line-clamp-2 font-semibold break-words">
              {item.title}
            </span>
            <ItemStatusIcons item={item} />
          </div>

          {/* 觸控裝置上按鈕的點擊範圍會擴大，間距跟著加大，避免相鄰按鈕互相蓋住 */}
          <div className="flex shrink-0 items-center gap-1 pointer-coarse:gap-3">
            {/* 手機上讓位給標題；日期在 drawer 裡仍看得到 */}
            <time
              dateTime={item.createdAt.toISOString()}
              className="mr-1 hidden text-sm text-muted-foreground sm:inline"
            >
              {formatDate(item.createdAt)}
            </time>
            <FavoriteButton
              kind="item"
              id={item.id}
              name={item.title}
              isFavorite={item.isFavorite}
              variant="icon"
            />
            {/* 圖片、檔案與沒有內容的 item 沒有東西可複製 */}
            {item.hasCopyValue && (
              <CopyItemButton id={item.id} title={item.title} />
            )}
          </div>
        </div>

        {item.description && (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              // relative z-10：疊在開啟 drawer 的覆蓋層之上，點標籤才會換頁
              <TagLink key={tag} name={tag} className="relative z-10" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
