import type { ItemKind } from "@/generated/prisma/enums";

export interface ItemTypeSummary {
  name: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
}

/** 型別列表頁的頁首與查詢用 */
export interface ItemTypeDetail extends ItemTypeSummary {
  id: string;
  slug: string;
}

export interface ItemTypeWithCount {
  id: string;
  name: string;
  slug: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
  /** Pro 方案才能使用的型別，UI 以 PRO 標示 */
  isProOnly: boolean;
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

export interface ItemCollectionSummary {
  id: string;
  name: string;
}

/** drawer 用的完整資料，點擊卡片時才經 /api/items/[id] 載入 */
export interface ItemDetail {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  isFavorite: boolean;
  pinnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  type: ItemTypeSummary & { kind: ItemKind };
  /** 標籤名稱，依名稱排序 */
  tags: string[];
  /** 依名稱排序，不含已刪除的 collection */
  collections: ItemCollectionSummary[];
}
