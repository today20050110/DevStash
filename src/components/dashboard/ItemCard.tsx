import { Pin, Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getItemType } from "@/lib/item-types";
import type { Item } from "@/lib/mock-data";

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const type = getItemType(item.typeId);
  const color = type?.color;

  return (
    <Card
      className="border-l-4 transition-colors hover:bg-muted/40"
      style={{ borderLeftColor: color }}
    >
      <CardContent className="flex gap-4">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          // 1a is ~10% alpha on the type's six-digit hex colour.
          style={{ backgroundColor: color && `${color}1a`, color }}
        >
          <TypeIcon name={type?.icon ?? "File"} className="size-5" />
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

          <p className="text-sm text-muted-foreground">{item.description}</p>

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
          dateTime={item.createdAt}
          className="shrink-0 text-sm text-muted-foreground"
        >
          {formatDate(item.createdAt)}
        </time>
      </CardContent>
    </Card>
  );
}
