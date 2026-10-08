"use client";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";

interface ItemCardTriggerProps {
  id: string;
  title: string;
}

/**
 * 覆蓋整張卡片的按鈕。卡片本身維持 server component；
 * 不把卡片包進 <button>，因為 button 內不能放 div 等區塊元素。
 * 焦點框用 inset-ring：Card 有 overflow-hidden，外圍的 ring 會被裁掉。
 */
export function ItemCardTrigger({ id, title }: ItemCardTriggerProps) {
  const { openItem } = useItemDrawer();

  return (
    <button
      type="button"
      onClick={() => openItem(id)}
      className="absolute inset-0 cursor-pointer rounded-xl outline-none focus-visible:inset-ring-2 focus-visible:inset-ring-ring"
    >
      <span className="sr-only">Open {title}</span>
    </button>
  );
}
