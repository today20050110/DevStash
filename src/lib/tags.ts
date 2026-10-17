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

/** 標籤頁的網址；卡片與 drawer 只有標籤名稱，slug 用存檔時同一個 toTagSlug 推出 */
export function tagHref(name: string): string {
  return `/tags/${encodeURIComponent(toTagSlug(name))}`;
}

/**
 * 路由參數還原成 slug。Next.js 傳入的參數可能已解碼，也可能還帶著 %xx；
 * 已解碼的 slug 本身含 % 時再解碼會丟例外，這時原樣使用
 */
export function slugFromParam(param: string): string {
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
  }
}

/** 逗號分隔輸入中，游標所在（最後一個逗號之後）正在輸入的片段 */
export function currentTagSegment(input: string): string {
  return input.slice(input.lastIndexOf(",") + 1).trim();
}

export interface TagOption {
  name: string;
  itemCount: number;
}

export const TAG_SUGGESTION_LIMIT = 6;

/**
 * 自動完成的建議：以目前片段做不分大小寫的子字串比對，排除欄位中已輸入的標籤，
 * 依使用次數、再依名稱排序。片段是空的時不建議，避免一打逗號就跳出清單
 */
export function suggestTags(
  input: string,
  options: TagOption[],
  limit = TAG_SUGGESTION_LIMIT,
): TagOption[] {
  const query = currentTagSegment(input).toLowerCase();
  if (query === "") {
    return [];
  }
  const entered = new Set(
    parseTagInput(input.slice(0, input.lastIndexOf(",") + 1)).map(toTagSlug),
  );
  return options
    .filter(
      (option) =>
        option.name.toLowerCase().includes(query) &&
        !entered.has(toTagSlug(option.name)),
    )
    .sort((a, b) => b.itemCount - a.itemCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** 以選取的標籤取代目前片段，後面接「, 」讓使用者直接輸入下一個 */
export function applyTagSuggestion(input: string, name: string): string {
  const before = input.slice(0, input.lastIndexOf(",") + 1);
  return `${before ? `${before.trimEnd()} ` : ""}${name}, `;
}
