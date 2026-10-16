import Link from "next/link";
import { Folder } from "lucide-react";

import { TypeIcon } from "@/components/dashboard/TypeIcon";
import { formatDate } from "@/lib/format";
import type { FavoriteCollection, FavoriteType } from "@/types/favorites";

/** item（button）與 collection（Link）共用的列樣式：高密度、等寬字、只有細微的 hover */
export const FAVORITE_ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-3 px-3 py-1.5 text-left font-mono text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted";

interface FavoriteRowContentProps {
  /** null：沒有型別（空的 collection），顯示資料夾圖示 */
  type: FavoriteType | null;
  title: string;
  badge: string;
  /** badge 旁的淡色補充，例如 collection 的 item 數 */
  meta?: string;
  date: Date;
}

export function FavoriteRowContent({
  type,
  title,
  badge,
  meta,
  date,
}: FavoriteRowContentProps) {
  return (
    <>
      {type ? (
        // 色碼來自資料庫，只能以 inline style 套用
        <TypeIcon
          name={type.icon}
          className="size-4 shrink-0"
          style={{ color: type.color }}
          aria-hidden
        />
      ) : (
        <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {meta && (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {meta}
        </span>
      )}
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-xs lowercase"
        // color-mix：ItemType.color 不保證是六位數 hex，無法直接加透明度
        style={
          type
            ? {
                color: type.color,
                backgroundColor: `color-mix(in srgb, ${type.color} 12%, transparent)`,
              }
            : undefined
        }
      >
        {badge}
      </span>
      <time
        dateTime={date.toISOString()}
        className="w-14 shrink-0 text-right text-xs text-muted-foreground"
      >
        {formatDate(date)}
      </time>
    </>
  );
}

export function FavoriteCollectionRow({
  collection,
}: {
  collection: FavoriteCollection;
}) {
  return (
    <Link href={`/collections/${collection.id}`} className={FAVORITE_ROW_CLASS}>
      <FavoriteRowContent
        type={collection.type}
        title={collection.name}
        badge="collection"
        meta={`${collection.itemCount} ${collection.itemCount === 1 ? "item" : "items"}`}
        date={collection.updatedAt}
      />
    </Link>
  );
}
