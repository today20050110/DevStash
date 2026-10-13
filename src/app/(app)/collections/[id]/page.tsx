import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { Folder, Star } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { ItemGrid } from "@/components/items/ItemGrid";
import { getCurrentUserId } from "@/lib/current-user";
import { getCollectionById } from "@/lib/db/collections";
import { getItemsInCollection } from "@/lib/db/items";

/**
 * generateMetadata 與頁面都需要 collection；以 cache() 包起來，同一個請求只查一次。
 * 不屬於目前使用者、不存在或已刪除時 notFound()，不透露是哪一種
 */
const getCollection = cache(async (id: string) => {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/collections/${id}`)}`,
    );
  }

  const collection = await getCollectionById(userId, id);
  if (!collection) {
    notFound();
  }
  return { userId, collection };
});

export async function generateMetadata({
  params,
}: PageProps<"/collections/[id]">): Promise<Metadata> {
  const { id } = await params;
  const { collection } = await getCollection(id);
  return { title: `${collection.name} — DevStash` };
}

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[id]">) {
  const { id } = await params;
  const { userId, collection } = await getCollection(id);
  const items = await getItemsInCollection(userId, collection.id);

  return (
    // 以頁面本身為容器，ItemGrid 依它決定欄數
    <div className="@container space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Folder className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-3xl font-bold break-words">
            {collection.name}
            {collection.isFavorite && (
              <Star
                className="size-5 shrink-0 fill-yellow-400 text-yellow-400"
                aria-label="Favorite"
              />
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
          {collection.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items in this collection yet.
        </p>
      ) : (
        <ItemGrid items={items} />
      )}
    </div>
  );
}
