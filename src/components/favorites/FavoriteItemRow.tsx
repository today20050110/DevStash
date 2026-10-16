"use client";

import {
  FAVORITE_ROW_CLASS,
  FavoriteRowContent,
} from "@/components/favorites/FavoriteRow";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import type { FavoriteItem } from "@/types/favorites";

/** 點擊開啟既有的 ItemDrawer，不換頁 */
export function FavoriteItemRow({ item }: { item: FavoriteItem }) {
  const { openItem } = useItemDrawer();

  return (
    <button
      type="button"
      onClick={() => openItem(item.id)}
      className={FAVORITE_ROW_CLASS}
    >
      <FavoriteRowContent
        type={item.type}
        title={item.title}
        badge={item.type.name}
        date={item.updatedAt}
      />
    </button>
  );
}
