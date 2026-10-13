import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPageList, pageHref } from "@/lib/pagination";

interface ListPaginationProps {
  /** 列表頁的路徑（不含 ?page） */
  basePath: string;
  page: number;
  pageCount: number;
}

/**
 * 列表下方的分頁：頁碼與 Previous／Next，第一頁與最後一頁時對應的按鈕停用。
 * 只有一頁時不顯示
 */
export function ListPagination({
  basePath,
  page,
  pageCount,
}: ListPaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={page > 1 ? pageHref(basePath, page - 1) : undefined}
          />
        </PaginationItem>
        {getPageList(page, pageCount).map((entry, index) =>
          entry === "ellipsis" ? (
            // 省略號最多兩個，位置固定在頁碼之間，以索引為 key 不會錯位
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={entry}>
              <PaginationLink
                href={pageHref(basePath, entry)}
                isActive={entry === page}
                aria-label={`Page ${entry}`}
              >
                {entry}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href={page < pageCount ? pageHref(basePath, page + 1) : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
