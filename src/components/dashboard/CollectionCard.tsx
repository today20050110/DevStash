import Link from "next/link";
import { Star } from "lucide-react";

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
      className="border-l-4 transition-colors hover:bg-muted/40"
      style={{ borderLeftColor: dominantType?.color }}
    >
      <CardContent className="space-y-3">
        <div>
          <Link
            href={`/collections/${collection.slug}`}
            className="flex items-center gap-2 font-semibold hover:underline"
          >
            {collection.name}
            {collection.isFavorite && (
              <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </Link>
          <p className="text-sm text-muted-foreground">
            {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
          </p>
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
