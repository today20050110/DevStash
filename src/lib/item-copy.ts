import type { ItemDetail } from "@/types/items";

type CopySource = Pick<ItemDetail, "content" | "url"> & {
  type: Pick<ItemDetail["type"], "kind">;
};

/** 卡片與 drawer 的 Copy 共用：link 複製網址，其他複製內容；沒有可複製的值時回傳 null */
export function getCopyValue(item: CopySource): string | null {
  const value = item.type.kind === "URL" ? item.url : item.content;
  return value ? value : null;
}
