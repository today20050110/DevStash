import { Pin, Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { CopyItemButton } from "@/components/items/CopyItemButton";
import { ItemCardTrigger } from "@/components/items/ItemCardTrigger";
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
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          // color-mix rather than appending alpha to the hex — ItemType.color is an
          // unconstrained String, so the six-digit form is not guaranteed.
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
            color,
          }}
        >
          <TypeIcon name={icon} className="size-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{item.title}</span>
            {item.pinnedAt && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
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
