/** 名稱沒有任何字母或數字（例如只有符號）時使用的 slug */
const FALLBACK_SLUG = "collection";

/**
 * collection 名稱轉成 slug：轉小寫，字母與數字以外的連續字元換成一個 -，去掉頭尾的 -。
 * 保留非英文的字母（中文名稱不會變成空字串）。
 */
export function toCollectionSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || FALLBACK_SLUG;
}

/**
 * base 已被使用時依序嘗試 base-2、base-3…，回傳第一個不在 taken 中的 slug。
 * taken 要包含已軟刪除的 collection：@@unique([userId, slug]) 不排除它們。
 */
export function nextAvailableSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) {
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
