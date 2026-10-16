import type { ReactNode } from "react";

interface FavoritesSectionProps {
  title: string;
  count: number;
  /** 這個區塊沒有收藏時顯示的訊息 */
  emptyMessage: string;
  children: ReactNode;
}

/** 標題列（名稱與數量）加上以細線分隔的列表；不用卡片或粗邊框 */
export function FavoritesSection({
  title,
  count,
  emptyMessage,
  children,
}: FavoritesSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-baseline gap-2 px-3 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
        <span className="tabular-nums">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="border-t px-3 py-3 font-mono text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ul className="divide-y border-y">{children}</ul>
      )}
    </section>
  );
}
