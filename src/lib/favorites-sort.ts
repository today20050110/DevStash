import type { FavoriteCollection, FavoriteItem } from "@/types/favorites";

/** /favorites 的排序選項；date 是伺服器查詢的原本順序 */
export const FAVORITE_SORTS = ["date", "name", "type"] as const;

export type FavoriteSort = (typeof FAVORITE_SORTS)[number];

export const FAVORITE_SORT_LABELS: Record<FavoriteSort, string> = {
  date: "Date",
  name: "Name",
  type: "Type",
};

/**
 * 固定 en locale：伺服器與瀏覽器的預設 locale 可能不同，結果要一致。
 * 不分大小寫，數字依數值比較（item 2 在 item 10 之前）
 */
const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

interface SortFields {
  name: string;
  updatedAt: Date;
  /** null（沒有 item 的 collection）在依型別排序時排最後 */
  typeName: string | null;
}

function compare(sort: FavoriteSort, a: SortFields, b: SortFields): number {
  switch (sort) {
    case "date":
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    case "name":
      return collator.compare(a.name, b.name);
    case "type":
      if (a.typeName !== b.typeName) {
        if (a.typeName === null) return 1;
        if (b.typeName === null) return -1;
        return collator.compare(a.typeName, b.typeName);
      }
      return collator.compare(a.name, b.name);
  }
}

/** 回傳新陣列；sort 是穩定排序，同值時保留傳入的順序 */
function sortBy<T>(
  list: T[],
  sort: FavoriteSort,
  fields: (entry: T) => SortFields,
): T[] {
  return [...list].sort((a, b) => compare(sort, fields(a), fields(b)));
}

export function sortFavoriteItems(
  items: FavoriteItem[],
  sort: FavoriteSort,
): FavoriteItem[] {
  return sortBy(items, sort, (item) => ({
    name: item.title,
    updatedAt: item.updatedAt,
    typeName: item.type.name,
  }));
}

export function sortFavoriteCollections(
  collections: FavoriteCollection[],
  sort: FavoriteSort,
): FavoriteCollection[] {
  return sortBy(collections, sort, (collection) => ({
    name: collection.name,
    updatedAt: collection.updatedAt,
    typeName: collection.type?.name ?? null,
  }));
}
