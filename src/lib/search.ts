// 只放純函式：command palette 的資料整理，伺服器端查詢與用戶端都可能用到

/** 預覽在 palette 裡只顯示一行，超過的部分以 … 結尾 */
export const SEARCH_PREVIEW_LENGTH = 120;

/**
 * content／url／檔名的開頭轉成單行預覽：連續空白（含換行、縮排）壓成一個空格，
 * 去掉頭尾空白，超過上限時截斷並加上 …。沒有內容時回傳 null
 */
export function toSearchPreview(
  text: string | null,
  maxLength = SEARCH_PREVIEW_LENGTH,
): string | null {
  if (text === null) {
    return null;
  }
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine === "") {
    return null;
  }
  return singleLine.length > maxLength
    ? `${singleLine.slice(0, maxLength).trimEnd()}…`
    : singleLine;
}
