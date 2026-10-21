"use client";

import { createContext, useContext, type ReactNode } from "react";

const IsProContext = createContext(false);

/**
 * 目前使用者是否為 Pro，供 client 元件決定是否顯示 Pro 功能（例如 Suggest Tags）。
 * 只是 UI 層的顯示判斷，實際限制在 server action。與 TagOptionsProvider 相同，
 * 新增 dialog 與 drawer 的編輯表單相距很遠，以 context 提供而不是一路傳 props
 */
export function PlanProvider({
  isPro,
  children,
}: {
  isPro: boolean;
  children: ReactNode;
}) {
  return (
    <IsProContext.Provider value={isPro}>{children}</IsProContext.Provider>
  );
}

export function useIsPro(): boolean {
  return useContext(IsProContext);
}
