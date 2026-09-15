export interface CollectionTypeSummary {
  id: string;
  name: string;
  slug: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
  /** 此型別在該 collection 中的 item 數量 */
  count: number;
}

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFavorite: boolean;
  itemCount: number;
  /** 依數量由多到少排序；第一個為主要型別，決定卡片邊框色 */
  types: CollectionTypeSummary[];
}
