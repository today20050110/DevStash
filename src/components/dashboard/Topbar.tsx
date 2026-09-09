import { FolderPlus, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Dashboard top bar. Search and the two action buttons are display only —
 * the sidebar trigger is the one control that works.
 */
export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger />

      <div className="relative w-full max-w-lg">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items..."
          className="h-9 pr-16 pl-9"
        />
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-sans text-[0.7rem] text-muted-foreground">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="lg" className="hidden sm:inline-flex">
          <FolderPlus />
          New Collection
        </Button>
        <Button size="lg">
          <Plus />
          New Item
        </Button>
      </div>
    </header>
  );
}
