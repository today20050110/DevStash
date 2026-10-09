import { TypeIconTile } from "@/components/dashboard/TypeIconTile";
import { CopyItemButton } from "@/components/items/CopyItemButton";
import { ItemCardTrigger } from "@/components/items/ItemCardTrigger";
import { ItemStatusIcons } from "@/components/items/ItemStatusIcons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { ItemSummary } from "@/types/items";

interface ItemCardProps {
  item: ItemSummary;
}

export function ItemCard({ item }: ItemCardProps) {
  const { color, icon } = item.type;

  return (
    <Card
      className="relative border-l-4 transition-colors hover:bg-muted/40"
      style={{ borderLeftColor: color }}
    >
      <ItemCardTrigger id={item.id} title={item.title} />
      <CardContent className="flex gap-4">
        <TypeIconTile icon={icon} color={color} />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{item.title}</span>
            <ItemStatusIcons item={item} />
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <time
          dateTime={item.createdAt.toISOString()}
          className="shrink-0 text-sm text-muted-foreground"
        >
          {formatDate(item.createdAt)}
        </time>
        {/* 圖片、檔案與沒有內容的 item 沒有東西可複製 */}
        {item.hasCopyValue && (
          <CopyItemButton id={item.id} title={item.title} />
        )}
      </CardContent>
    </Card>
  );
}
