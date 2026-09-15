export interface ItemTypeSummary {
  name: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
}

export interface ItemTypeWithCount {
  id: string;
  name: string;
  slug: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
  /** 目前使用者在此型別下的 item 數量（不含已刪除） */
  itemCount: number;
}

export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  pinnedAt: Date | null;
  createdAt: Date;
  /** 決定卡片的圖示與左邊框色 */
  type: ItemTypeSummary;
  /** 標籤名稱，依名稱排序 */
  tags: string[];
}
