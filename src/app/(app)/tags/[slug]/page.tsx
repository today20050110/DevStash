import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { Tag } from "lucide-react";

import { SIGN_IN_PATH } from "@/auth.config";
import { ItemGrid } from "@/components/items/ItemGrid";
import { ListPagination } from "@/components/pagination/ListPagination";
import { getCurrentUserId } from "@/lib/current-user";
import { getItemsByTagPage } from "@/lib/db/items";
import { getTagBySlug } from "@/lib/db/tags";
import { parsePageParam } from "@/lib/pagination";
import { slugFromParam } from "@/lib/tags";

/**
 * generateMetadata 與頁面都需要標籤；以 cache() 包起來，同一個請求只查一次。
 * 標籤不存在或屬於別人時 notFound()，不透露它是否存在
 */
const getTag = cache(async (param: string) => {
  await connection();

  const slug = slugFromParam(param);
  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/tags/${encodeURIComponent(slug)}`)}`,
    );
  }

  const tag = await getTagBySlug(userId, slug);
  if (!tag) {
    notFound();
  }
  return { userId, tag };
});

export async function generateMetadata({
  params,
}: PageProps<"/tags/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { tag } = await getTag(slug);
  return { title: `#${tag.name} — DevStash` };
}

export default async function TagPage({
  params,
  searchParams,
}: PageProps<"/tags/[slug]">) {
  const { slug } = await params;
  const { userId, tag } = await getTag(slug);
  const { page: pageParam } = await searchParams;
  const {
    rows: items,
    total,
    page,
    pageCount,
  } = await getItemsByTagPage(userId, tag.id, parsePageParam(pageParam));

  return (
    // 以頁面本身為容器，ItemGrid 依它決定欄數
    <div className="@container space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Tag className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold">#{tag.name}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No items with this tag.
        </p>
      ) : (
        <ItemGrid items={items} />
      )}

      <ListPagination
        basePath={`/tags/${encodeURIComponent(tag.slug)}`}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
