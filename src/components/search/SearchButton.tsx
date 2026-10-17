"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";

import { useCommandPalette } from "@/components/search/CommandPalette";

function subscribe() {
  // 平台不會在頁面存活期間改變，不需要訂閱
  return () => {};
}

function getIsApple() {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/** 伺服器沒有 navigator；先以 ⌘ 渲染，hydrate 後依平台更正，不會有 hydration 不一致 */
function getServerIsApple() {
  return true;
}

/**
 * Top bar 的搜尋框：外觀沿用輸入框，實際是開啟 command palette 的按鈕，
 * 鍵盤與螢幕閱讀器使用者都知道它會開啟對話框
 */
export function SearchButton() {
  const { openPalette } = useCommandPalette();
  const isApple = useSyncExternalStore(subscribe, getIsApple, getServerIsApple);

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-haspopup="dialog"
      className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-input bg-transparent text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-9 sm:w-full sm:max-w-lg sm:min-w-0 sm:shrink sm:justify-start sm:pr-3 sm:pl-9 lg:pr-16 dark:bg-input/30"
    >
      {/* sm 以下只剩放大鏡圖示；文字改為 sr-only，可及名稱在各寬度都一樣 */}
      <Search className="pointer-events-none size-4 sm:absolute sm:top-1/2 sm:left-3 sm:-translate-y-1/2" />
      <span className="sr-only sm:not-sr-only sm:truncate">Search items...</span>
      {/* 觸控裝置通常沒有實體鍵盤；md 起桌面側邊欄佔掉 256px，搜尋框太窄，lg 以上才顯示快捷鍵提示 */}
      <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-sans text-[0.7rem] lg:block">
        {isApple ? "⌘ K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
