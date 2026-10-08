// 只放純函式、不 import 其他模組：prisma/seed.ts 以相對路徑引用，client 元件也會用到

/** 標籤名稱正規化為 slug：「React Hooks」與「react hooks」視為同一個標籤 */
export function toTagSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/** 編輯表單的逗號分隔輸入轉成標籤陣列，去掉前後空白與空項目 */
export function parseTagInput(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

/** slug 相同的標籤只留第一次出現的名稱，避免同一個 item 連到同一個 tag 兩次 */
export function dedupeTagNames(names: string[]): string[] {
  const bySlug = new Map<string, string>();
  for (const name of names) {
    const slug = toTagSlug(name);
    if (!bySlug.has(slug)) {
      bySlug.set(slug, name.trim());
    }
  }
  return [...bySlug.values()];
}
