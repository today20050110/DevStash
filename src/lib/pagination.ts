// 分頁的常數與純函式：頁面、lib/db 與分頁元件共用
import { firstParam } from "@/lib/search-params";

export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;
export const DASHBOARD_COLLECTIONS_LIMIT = 6;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

export interface Page<T> {
  rows: T[];
  /** 全部筆數（頁首顯示用），不是這一頁的筆數 */
  total: number;
  /** 實際顯示的頁碼（超出範圍時已修正到最後一頁） */
  page: number;
  pageCount: number;
}

/** 網址的 ?page=：只接受正整數，其他（缺少、abc、0、負數、小數）都視為第 1 頁 */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = firstParam(value);
  if (!raw || !/^\d+$/.test(raw)) {
    return 1;
  }
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** 至少 1 頁：沒有資料時仍顯示第 1 頁的空狀態 */
export function getPageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

/**
 * 先計數再取當頁：超過最後一頁時改顯示最後一頁，而不是一頁空白。
 * 兩次查詢之間若有資料被刪除，最多只是最後一頁少幾筆
 */
export async function loadPage<T>(
  requestedPage: number,
  perPage: number,
  count: () => Promise<number>,
  fetchRows: (skip: number, take: number) => Promise<T[]>,
): Promise<Page<T>> {
  const total = await count();
  const pageCount = getPageCount(total, perPage);
  const page = Math.min(requestedPage, pageCount);
  const rows =
    total === 0 ? [] : await fetchRows((page - 1) * perPage, perPage);
  return { rows, total, page, pageCount };
}

export type PageListEntry = number | "ellipsis";

/**
 * 要顯示的頁碼：第一頁、最後一頁、目前頁的前後各一頁，其餘以省略號代替。
 * 只省略一頁時直接顯示該頁（1 2 3 比 1 … 3 好讀），例如第 5／20 頁為 1 … 4 5 6 … 20
 */
export function getPageList(page: number, pageCount: number): PageListEntry[] {
  const shown = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...shown]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);

  const entries: PageListEntry[] = [];
  for (const n of pages) {
    const previous = entries.at(-1);
    if (typeof previous === "number" && n - previous === 2) {
      entries.push(previous + 1);
    } else if (typeof previous === "number" && n - previous > 2) {
      entries.push("ellipsis");
    }
    entries.push(n);
  }
  return entries;
}

/** 第 1 頁不帶參數，網址與沒分頁前相同 */
export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}
