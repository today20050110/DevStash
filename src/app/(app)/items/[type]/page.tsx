import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { SIGN_IN_PATH } from "@/auth.config";
import { ItemCard } from "@/components/dashboard/ItemCard";
import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { getCurrentUserId } from "@/lib/current-user";
import { getItemTypeBySlug, getItemsByType } from "@/lib/db/items";

/**
 * generateMetadata 與頁面都需要型別；以 cache() 包起來，同一個請求只查一次。
 * 型別不存在時 notFound()，其他使用者的自訂型別同樣視為不存在。
 */
const getItemType = cache(async (slug: string) => {
  // 與 dashboard 相同：明確宣告動態渲染，避免 build 時預先渲染
  await connection();

  const userId = await getCurrentUserId();
  // proxy 只驗 JWT 簽章；帳號已刪除但 token 未過期時，在這裡擋下
  if (!userId) {
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`/items/${slug}`)}`,
    );
  }

  const itemType = await getItemTypeBySlug(userId, slug);
  if (!itemType) {
    notFound();
  }
  return { userId, itemType };
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
}: PageProps<"/items/[type]">) {
  const { type } = await params;
  const { userId, itemType } = await getItemType(type);
  const items = await getItemsByType(userId, itemType.id);

  return (
    // 以頁面本身為容器：側邊欄佔去寬度時，視窗的 md 斷點會讓兩欄窄到無法閱讀
    <div className="@container space-y-8">
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg"
          // 色碼來自資料庫，同 ItemCard 以 inline style 套用
          style={{
            backgroundColor: `color-mix(in srgb, ${itemType.color} 10%, transparent)`,
            color: itemType.color,
          }}
        >
          <TypeIcon name={itemType.icon} className="size-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{itemType.name}</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-4 @3xl:grid-cols-2 @5xl:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No items yet.</p>
      )}
    </div>
  );
}
