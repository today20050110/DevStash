import { FolderHeart, Folders, Layers, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardStats } from "@/types/dashboard";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Items", value: stats.items, icon: Layers },
    { label: "Collections", value: stats.collections, icon: Folders },
    { label: "Favorite Items", value: stats.favoriteItems, icon: Star },
    {
      label: "Favorite Collections",
      value: stats.favoriteCollections,
      icon: FolderHeart,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon }) => (
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
