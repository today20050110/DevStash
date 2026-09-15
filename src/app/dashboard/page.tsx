import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Pin } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { getCurrentUserId } from "@/lib/current-user";
import { getCollectionCounts, getRecentCollections } from "@/lib/db/collections";
import { getItemCounts, getPinnedItems, getRecentItems } from "@/lib/db/items";
import type { CollectionSummary } from "@/types/collections";
import type { DashboardStats } from "@/types/dashboard";
import type { ItemSummary } from "@/types/items";

export const metadata: Metadata = {
  title: "Dashboard — DevStash",
};

const EMPTY_STATS: DashboardStats = {
  items: 0,
  favoriteItems: 0,
  collections: 0,
  favoriteCollections: 0,
};

interface DashboardData {
  stats: DashboardStats;
  collections: CollectionSummary[];
  pinnedItems: ItemSummary[];
  recentItems: ItemSummary[];
}

async function getDashboardData(): Promise<DashboardData> {
  // 查詢不經過 cookies/headers 等 request-time API，不呼叫的話 Next.js
  // 會在 build 時預先渲染，資料就凍結在 build 當下
  await connection();

  const userId = await getCurrentUserId();
  if (!userId) {
    return {
      stats: EMPTY_STATS,
      collections: [],
      pinnedItems: [],
      recentItems: [],
    };
  }

  const [collections, collectionCounts, itemCounts, pinnedItems, recentItems] =
    await Promise.all([
      getRecentCollections(userId),
      getCollectionCounts(userId),
      getItemCounts(userId),
      getPinnedItems(userId),
      getRecentItems(userId),
    ]);
  return {
    stats: { ...itemCounts, ...collectionCounts },
    collections,
    pinnedItems,
    recentItems,
  };
}

export default async function DashboardPage() {
  const { stats, collections, pinnedItems, recentItems } =
    await getDashboardData();

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your developer knowledge hub</p>
      </div>

      <StatsCards stats={stats} />

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
        {collections.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No collections yet.</p>
        )}
      </section>

      {pinnedItems.length > 0 && (
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
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Items</h2>
        {recentItems.length > 0 ? (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        )}
      </section>
    </div>
  );
}
