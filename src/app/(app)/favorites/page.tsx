import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Star } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { FavoritesList } from "@/components/favorites/FavoritesList";
import { getCurrentUserId } from "@/lib/current-user";
import { listFavoriteCollections, listFavoriteItems } from "@/lib/db/favorites";

export const metadata: Metadata = {
  title: "Favorites — DevStash",
};

async function getFavoritesData() {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=/favorites`);
  }

  const [items, collections] = await Promise.all([
    listFavoriteItems(userId),
    listFavoriteCollections(userId),
  ]);
  return { items, collections };
}

export default async function FavoritesPage() {
  const { items, collections } = await getFavoritesData();
  const heading = (
    <div className="space-y-1">
      <h1 className="text-3xl font-bold">Favorites</h1>
      <p className="text-muted-foreground">
        Your starred items and collections
      </p>
    </div>
  );

  return (
    <div className="max-w-4xl space-y-8">
      {items.length === 0 && collections.length === 0 ? (
        <>
          {heading}
          <div className="flex flex-col items-center gap-2 border-y py-16 text-center">
            <Star className="size-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">No favorites yet</p>
            <p className="text-sm text-muted-foreground">
              Starred items and collections will show up here.
            </p>
          </div>
        </>
      ) : (
        <FavoritesList
          heading={heading}
          items={items}
          collections={collections}
        />
      )}
    </div>
  );
}
