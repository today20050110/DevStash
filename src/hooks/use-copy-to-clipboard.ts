"use client";

import { useEffect, useRef, useState } from "react";

const COPIED_RESET_MS = 2000;

/** 寫入剪貼簿；成功後 2 秒內 copied 為 true，供按鈕顯示「Copied」 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 非安全來源或使用者拒絕權限時寫入失敗，不顯示「Copied」
      return;
    }
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return { copied, copy };
}
