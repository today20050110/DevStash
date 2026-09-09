import { FolderHeart, Folders, Layers, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { collections, items } from "@/lib/mock-data";

// Counts are derived from the arrays rather than read off the display-only
// `itemCount` fields, because the real implementation will be a count() query.
const stats = [
  { label: "Items", value: items.length, icon: Layers },
  { label: "Collections", value: collections.length, icon: Folders },
  {
    label: "Favorite Items",
    value: items.filter((item) => item.isFavorite).length,
    icon: Star,
  },
  {
    label: "Favorite Collections",
    value: collections.filter((collection) => collection.isFavorite).length,
    icon: FolderHeart,
  },
];

export function StatsCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-semibold tabular-nums">{value}</div>
              <div className="truncate text-sm text-muted-foreground">
                {label}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
