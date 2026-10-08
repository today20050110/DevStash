"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { ItemDetailRequest } from "@/hooks/use-item-detail";

interface ItemDrawerContextValue {
  openItem: (id: string) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

/**
 * 頁面都是 server component，drawer 的開關與目前選取的 item 放在這個 client wrapper。
 * 關閉時保留 request，滑出動畫期間內容不會先消失。
 */
export function ItemDrawerProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ItemDetailRequest | null>(null);
  const [open, setOpen] = useState(false);

  function openItem(id: string) {
    setRequest((previous) => ({ id, key: (previous?.key ?? 0) + 1 }));
    setOpen(true);
  }

  return (
    <ItemDrawerContext value={{ openItem }}>
      {children}
      <ItemDrawer request={request} open={open} onOpenChange={setOpen} />
    </ItemDrawerContext>
  );
}

export function useItemDrawer(): ItemDrawerContextValue {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used within ItemDrawerProvider");
  }
  return context;
}
