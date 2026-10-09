"use client";

import { useEffect, useRef, useState } from "react";

const COPIED_RESET_MS = 2000;

/**
 * 寫入剪貼簿；成功後 2 秒內 copied 為 true，供按鈕顯示「Copied」。
 * 內容需要先向伺服器載入時傳入 promise：以 ClipboardItem 在點擊當下就呼叫剪貼簿 API，
 * 否則 Safari 會因為 await 之後已不在使用者手勢內而拒絕寫入。
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  /** 回傳是否成功；非安全來源、使用者拒絕權限或 promise 失敗時為 false */
  async function copy(text: string | Promise<string>): Promise<boolean> {
    try {
      if (typeof text === "string") {
        await navigator.clipboard.writeText(text);
      } else if (typeof ClipboardItem !== "undefined") {
        const blob = text.then(
          (value) => new Blob([value], { type: "text/plain" }),
        );
        await navigator.clipboard.write([
          new ClipboardItem({ "text/plain": blob }),
        ]);
      } else {
        await navigator.clipboard.writeText(await text);
      }
    } catch {
      return false;
    }
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return true;
  }

  return { copied, copy };
}
