import Link from "next/link";
import { Star } from "lucide-react";

import { TopbarActions } from "@/components/dashboard/TopbarActions";
import { SearchButton } from "@/components/search/SearchButton";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CollectionOption } from "@/types/collections";
import type { CreatableItemType } from "@/types/items";

interface TopbarProps {
  /** New Item dialog 可選的型別 */
  itemTypes: CreatableItemType[];
  /** New Item dialog 可加入的 collections */
  collections: CollectionOption[];
}

/**
 * Dashboard top bar: sidebar trigger, search (opens the command palette),
 * Favorites link (sm and up), and the create actions (one "+" menu below sm).
 */
export function Topbar({ itemTypes, collections }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="relative pointer-coarse:hit-area" />

      <SearchButton />

      <div className="ml-auto flex items-center gap-2">
        {/* sm 以下改由側邊欄（手機上是 drawer）的 Favorites 連結進入 */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex"
          asChild
        >
          <Link href="/favorites" aria-label="Favorites" title="Favorites">
            <Star />
          </Link>
        </Button>
        <TopbarActions itemTypes={itemTypes} collections={collections} />
      </div>
    </header>
  );
}
