import { Folders, Layers } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ItemTypeWithCount } from "@/types/items";

interface ProfileStatsProps {
  items: number;
  collections: number;
  itemTypes: ItemTypeWithCount[];
}

export function ProfileStats({
  items,
  collections,
  itemTypes,
}: ProfileStatsProps) {
  const totals = [
    { label: "Items", value: items, icon: Layers },
    { label: "Collections", value: collections, icon: Folders },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {totals.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-semibold tabular-nums">
                  {value}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {label}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items by type</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {itemTypes.map((type) => (
              <li key={type.id} className="flex items-center gap-3 text-sm">
                {/* 色碼由資料決定，無法寫成 Tailwind class（與側邊欄相同的例外） */}
                <TypeIcon
                  name={type.icon}
                  className="size-4 shrink-0"
                  style={{ color: type.color }}
                />
                <span className="flex-1 truncate">{type.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {type.itemCount}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
