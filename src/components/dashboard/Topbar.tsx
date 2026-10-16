import Link from "next/link";
import { Star } from "lucide-react";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
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
 * Favorites link, New Collection and New Item.
 */
export function Topbar({ itemTypes, collections }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger />

      <SearchButton />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/favorites" aria-label="Favorites" title="Favorites">
            <Star />
          </Link>
        </Button>
        <NewCollectionDialog />
        <NewItemDialog itemTypes={itemTypes} collections={collections} />
      </div>
    </header>
  );
}
