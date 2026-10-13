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
      className="relative flex h-9 w-full max-w-lg items-center rounded-lg border border-input bg-transparent pr-16 pl-9 text-left text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      Search items...
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-sans text-[0.7rem]">
        {isApple ? "⌘ K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
