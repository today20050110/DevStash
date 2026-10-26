"use client";

import { useState, type ReactNode } from "react";

import { FavoriteItemRow } from "@/components/favorites/FavoriteItemRow";
import { FavoriteCollectionRow } from "@/components/favorites/FavoriteRow";
import { FavoritesSection } from "@/components/favorites/FavoritesSection";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FAVORITE_SORT_LABELS,
  FAVORITE_SORTS,
  sortFavoriteCollections,
  sortFavoriteItems,
  type FavoriteSort,
} from "@/lib/favorites-sort";
import type { FavoriteCollection, FavoriteItem } from "@/types/favorites";

interface FavoritesListProps {
  /** 頁面標題（server 端渲染），與排序選單放在同一列 */
  heading: ReactNode;
  items: FavoriteItem[];
  collections: FavoriteCollection[];
}

/**
 * 排序只在用戶端進行，不重新查詢；一個選單同時套用到兩個區塊。
 * 不保存選擇，重新進入頁面時回到 date（伺服器的原本順序）
 */
export function FavoritesList({
  heading,
  items,
  collections,
}: FavoritesListProps) {
  const [sort, setSort] = useState<FavoriteSort>("date");
  const sortedItems = sortFavoriteItems(items, sort);
  const sortedCollections = sortFavoriteCollections(collections, sort);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {heading}
        <div className="flex items-center gap-2">
          <Label
            htmlFor="favorites-sort"
            className="text-sm font-normal text-muted-foreground"
          >
            Sort by
          </Label>
          <Select
            value={sort}
            onValueChange={(value) => setSort(value as FavoriteSort)}
          >
            <SelectTrigger id="favorites-sort" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FAVORITE_SORTS.map((option) => (
                <SelectItem key={option} value={option}>
                  {FAVORITE_SORT_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <FavoritesSection
        title="Items"
        count={sortedItems.length}
        emptyMessage="No favorite items. Star an item to add it here."
      >
        {sortedItems.map((item) => (
          <li key={item.id}>
            <FavoriteItemRow item={item} />
          </li>
        ))}
      </FavoritesSection>
      <FavoritesSection
        title="Collections"
        count={sortedCollections.length}
        emptyMessage="No favorite collections. Star a collection to add it here."
      >
        {sortedCollections.map((collection) => (
          <li key={collection.id}>
            <FavoriteCollectionRow collection={collection} />
          </li>
        ))}
      </FavoritesSection>
    </>
  );
}
