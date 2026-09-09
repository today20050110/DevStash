import Link from "next/link";
import { Star } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Card, CardContent } from "@/components/ui/card";
import { getItemType } from "@/lib/item-types";
import type { Collection } from "@/lib/mock-data";

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  // First entry is the dominant type; it drives the card's accent colour.
  const dominantType = getItemType(collection.typeIds[0]);

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
            {collection.itemCount} items
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          {collection.description}
        </p>

        <div className="flex items-center gap-2">
          {collection.typeIds.map((typeId) => {
            const type = getItemType(typeId);
            if (!type) return null;
            return (
              <TypeIcon
                key={typeId}
                name={type.icon}
                className="size-4"
                style={{ color: type.color }}
                aria-label={type.name}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
