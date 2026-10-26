import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Folder } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ListPagination } from "@/components/pagination/ListPagination";
import { getCurrentUserId } from "@/lib/current-user";
import { getCollectionsPage } from "@/lib/db/collections";
import { parsePageParam } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Collections — DevStash",
};

export default async function CollectionsPage({
  searchParams,
}: PageProps<"/collections">) {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent("/collections")}`,
    );
  }
  const { page: pageParam } = await searchParams;
  const {
    rows: collections,
    total,
    page,
    pageCount,
  } = await getCollectionsPage(userId, parsePageParam(pageParam));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "collection" : "collections"}
        </p>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          icon={<Folder />}
          title="No collections yet"
          hint="Use New Collection in the top bar to group related items."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}

      <ListPagination
        basePath="/collections"
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
