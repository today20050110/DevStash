"use client";

import type { MouseEvent, ReactNode } from "react";

import { useSidebar } from "@/components/ui/sidebar";

/**
 * 手機上側邊欄是 drawer（Sheet），點了連結換頁後不會自己關閉。
 * 包住側邊欄內容，點到任何連結就關閉 drawer；連到目前頁面時 pathname 不變，
 * 所以不用監聽 pathname。使用者選單在 portal 裡，但 React 事件仍會沿元件樹冒泡到這裡
 */
export function SidebarCloseOnNavigate({ children }: { children: ReactNode }) {
  const { isMobile, setOpenMobile } = useSidebar();

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!isMobile) return;
    // 修飾鍵點擊是開新分頁或新視窗，目前頁面不會換頁
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element) || !event.target.closest("a[href]")) return;
    setOpenMobile(false);
  }

  return (
    // contents：wrapper 本身不產生 box，不影響 Sidebar 的 flex 版面
    <div className="contents" onClick={handleClick}>
      {children}
    </div>
  );
}
