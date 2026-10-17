"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { TagOption } from "@/lib/tags";

const TagOptionsContext = createContext<TagOption[]>([]);

/**
 * 使用者既有的標籤，供 Tags 欄位自動完成。新增 dialog 在 top bar、編輯表單在 drawer 深處，
 * 以 context 提供而不是一路傳 props。存檔後的 router.refresh() 會讓 layout 重新取得
 */
export function TagOptionsProvider({
  options,
  children,
}: {
  options: TagOption[];
  children: ReactNode;
}) {
  return (
    <TagOptionsContext.Provider value={options}>
      {children}
    </TagOptionsContext.Provider>
  );
}

export function useTagOptions(): TagOption[] {
  return useContext(TagOptionsContext);
}
