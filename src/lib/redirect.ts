export const DEFAULT_REDIRECT = "/dashboard";

// 只用來判斷解析後是否仍在同一個 origin，不會出現在結果裡
const PLACEHOLDER_ORIGIN = "http://devstash.invalid";

/**
 * 登入後的導向目標只接受站內路徑，避免 open redirect。
 *
 * 不能只檢查字串開頭：瀏覽器解析網址時會刪掉 tab 與換行、把 "\" 當成 "/"，
 * "/\t/evil.com" 會變成 "//evil.com"。改用與瀏覽器相同的 WHATWG URL
 * 解析器，解析後 origin 不變才接受，並回傳正規化後的路徑。
 */
export function getSafeRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return DEFAULT_REDIRECT;
  }

  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) {
      return DEFAULT_REDIRECT;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
