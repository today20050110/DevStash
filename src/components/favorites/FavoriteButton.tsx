"use client";

import { Star } from "lucide-react";

import { setCollectionFavorite } from "@/actions/collections";
import { setItemFavorite } from "@/actions/items";
import { Button } from "@/components/ui/button";
import { useFavoriteToggle } from "@/hooks/use-favorite-toggle";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  /** server component 不能傳函式，所以以種類與 id 決定呼叫哪個 action */
  kind: "item" | "collection";
  id: string;
  /** item 標題或 collection 名稱，用於螢幕閱讀器的說明 */
  name: string;
  isFavorite: boolean;
  /**
   * icon：卡片上的星號（疊在整張卡片的點擊層之上）；
   * labeled：drawer 與 collection 頁帶文字的按鈕
   */
  variant: "icon" | "labeled";
  onSaved?: (isFavorite: boolean) => void;
}

const SAVE = { item: setItemFavorite, collection: setCollectionFavorite };

export function FavoriteButton({
  kind,
  id,
  name,
  isFavorite: initial,
  variant,
  onSaved,
}: FavoriteButtonProps) {
  const { isFavorite, isPending, toggle } = useFavoriteToggle({
    isFavorite: initial,
    save: (next) => SAVE[kind](id, next),
    onSaved,
  });
  const star = (
    <Star className={cn(isFavorite && "fill-yellow-400 text-yellow-400")} />
  );

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={isFavorite}
        aria-label={`${isFavorite ? "Unfavorite" : "Favorite"} ${name}`}
        title={isFavorite ? "Unfavorite" : "Favorite"}
        className="relative z-10 -my-1 shrink-0 text-muted-foreground hover:text-foreground pointer-coarse:hit-area"
      >
        {star}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={isFavorite}
      className="relative pointer-coarse:hit-area"
    >
      {star}
      <span className={cn(isFavorite && "text-yellow-400")}>
        {isFavorite ? "Favorited" : "Favorite"}
      </span>
    </Button>
  );
}
