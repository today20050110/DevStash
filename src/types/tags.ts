/** 標籤總覽與自動完成用：itemCount 只算未刪除的 items */
export interface TagSummary {
  name: string;
  slug: string;
  itemCount: number;
}
