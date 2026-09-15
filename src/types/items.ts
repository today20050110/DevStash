export interface ItemTypeSummary {
  name: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
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
