import type { Metadata } from "next";
import Link from "next/link";
import { Pin } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { collections, items } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard — DevStash",
};

const recentCollections = [...collections].sort((a, b) =>
  b.createdAt.localeCompare(a.createdAt)
);

const pinnedItems = items
  .filter((item) => item.pinnedAt !== null)
  .sort((a, b) => (b.pinnedAt ?? "").localeCompare(a.pinnedAt ?? ""));

// Pinned items are not excluded here — pinned and recent are different axes,
// so an item legitimately shows up in both.
const recentItems = [...items]
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 10);

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your developer knowledge hub</p>
      </div>

      <StatsCards />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Collections</h2>
          <Link
            href="/collections"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recentCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Pin className="size-4 text-muted-foreground" />
          Pinned
        </h2>
        <div className="space-y-3">
          {pinnedItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Items</h2>
        <div className="space-y-3">
          {recentItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
