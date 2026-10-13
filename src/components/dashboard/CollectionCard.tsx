import Link from "next/link";
import { Star } from "lucide-react";

import { CollectionCardMenu } from "@/components/collections/CollectionCardMenu";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Card, CardContent } from "@/components/ui/card";
import type { CollectionSummary } from "@/types/collections";

interface CollectionCardProps {
  collection: CollectionSummary;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  // types 已依數量排序，第一個即主要型別；空的 collection 沿用預設邊框色
  const dominantType = collection.types[0];

  return (
    <Card
      className="relative border-l-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50 hover:bg-muted/40"
      style={{ borderLeftColor: dominantType?.color }}
    >
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {/* after: 把連結的可點範圍撐滿整張卡片；連結文字仍只有名稱，螢幕閱讀器不會念出整張卡片 */}
            <Link
              href={`/collections/${collection.id}`}
              className="flex items-center gap-2 font-semibold outline-none after:absolute after:inset-0 hover:underline"
            >
              <span className="truncate">{collection.name}</span>
              {collection.isFavorite && (
                <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
              )}
            </Link>
            <p className="text-sm text-muted-foreground">
              {collection.itemCount}{" "}
              {collection.itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <CollectionCardMenu collection={collection} />
        </div>

        {collection.description && (
          <p className="text-sm text-muted-foreground">
            {collection.description}
          </p>
        )}

        {collection.types.length > 0 && (
          <div className="flex items-center gap-2">
            {collection.types.map((type) => (
              <TypeIcon
                key={type.id}
                name={type.icon}
                className="size-4"
                style={{ color: type.color }}
                aria-label={type.name}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
