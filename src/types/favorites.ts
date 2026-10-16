/** 列上的型別圖示與 badge 用 */
export interface FavoriteType {
  name: string;
  /** lucide-react icon name */
  icon: string;
  color: string;
}

export interface FavoriteItem {
  id: string;
  title: string;
  /** 沒有 favoritedAt 欄位，以 updatedAt 近似「最近收藏」，排序與顯示的日期都用它 */
  updatedAt: Date;
  type: FavoriteType;
}

export interface FavoriteCollection {
  id: string;
  name: string;
  updatedAt: Date;
  itemCount: number;
  /** 數量最多的型別；沒有 item 時為 null */
  type: FavoriteType | null;
}

/** setItemFavorite／setCollectionFavorite 的回應；data 為寫入後的狀態 */
export interface FavoriteResult {
  success: boolean;
  data?: { isFavorite: boolean };
  error?: string;
}
