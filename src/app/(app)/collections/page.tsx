import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { getCurrentUserId } from "@/lib/current-user";
import { getAllCollections } from "@/lib/db/collections";

export const metadata: Metadata = {
  title: "Collections — DevStash",
};

export default async function CollectionsPage() {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(`${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent("/collections")}`);
  }
  const collections = await getAllCollections(userId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          {collections.length}{" "}
          {collections.length === 1 ? "collection" : "collections"}
        </p>
      </div>

      {collections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. Create one with New Collection.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
