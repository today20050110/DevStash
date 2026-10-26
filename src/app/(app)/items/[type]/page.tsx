import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { SIGN_IN_PATH } from "@/auth.config";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { TypeIconTile } from "@/components/dashboard/TypeIconTile";
import { FileList } from "@/components/items/FileList";
import { ItemGrid } from "@/components/items/ItemGrid";
import { ListPagination } from "@/components/pagination/ListPagination";
import { getCurrentUser } from "@/lib/current-user";
import { getItemTypeBySlug } from "@/lib/db/item-types";
import { getItemsByTypePage } from "@/lib/db/items";
import { getUploadCategory } from "@/lib/file-types";
import { parsePageParam } from "@/lib/pagination";
import { canUploadFiles } from "@/lib/plan";

/**
 * generateMetadata 與頁面都需要型別；以 cache() 包起來，同一個請求只查一次。
 * 型別不存在時 notFound()，其他使用者的自訂型別同樣視為不存在。
 */
const getItemType = cache(async (slug: string) => {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const user = await getCurrentUser();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!user) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/items/${slug}`)}`,
    );
  }

  const itemType = await getItemTypeBySlug(user.id, slug);
  if (!itemType) {
    notFound();
  }
  // Files／Images 的列表是 Pro 限定，與新增 item、上傳 route 用同一個判斷；Free 使用者導向升級頁
  if (itemType.kind === "FILE" && !canUploadFiles(user.isPro)) {
    redirect("/upgrade");
  }
  return { userId: user.id, itemType };
});

export async function generateMetadata({
  params,
}: PageProps<"/items/[type]">): Promise<Metadata> {
  const { type } = await params;
  const { itemType } = await getItemType(type);
  return { title: `${itemType.name} — DevStash` };
}

export default async function ItemsByTypePage({
  params,
  searchParams,
}: PageProps<"/items/[type]">) {
  const { type } = await params;
  const { userId, itemType } = await getItemType(type);
  const { page: pageParam } = await searchParams;
  const {
    rows: items,
    total,
    page,
    pageCount,
  } = await getItemsByTypePage(userId, itemType.id, parsePageParam(pageParam));

  return (
    // 以頁面本身為容器，ItemGrid 依它決定欄數
    <div className="@container space-y-8">
      <div className="flex items-center gap-3">
        <TypeIconTile icon={itemType.icon} color={itemType.color} />
        <div>
          <h1 className="text-3xl font-bold">{itemType.name}</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<TypeIcon name={itemType.icon} />}
          title={`No ${itemType.name.toLowerCase()} yet`}
          hint="Use New Item in the top bar to add one."
        />
      ) : getUploadCategory(itemType.slug) === "file" ? (
        // 版面是整頁的決定，沿用上傳規則的型別對照；dashboard 維持一般卡片
        <FileList items={items} />
      ) : (
        <ItemGrid items={items} />
      )}

      <ListPagination
        basePath={`/items/${itemType.slug}`}
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}
