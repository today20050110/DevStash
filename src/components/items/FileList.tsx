import { Download } from "lucide-react";
import { createElement } from "react";

import { ItemCardTrigger } from "@/components/items/ItemCardTrigger";
import { buttonVariants } from "@/components/ui/button";
import { getFileIcon } from "@/lib/file-icons";
import { formatDate, formatFileSize } from "@/lib/format";
import type { ItemFile, ItemSummary } from "@/types/items";

/** 桌面版的欄寬：名稱、大小、上傳日期、下載按鈕；標題列與每一列共用 */
const COLUMNS =
  "@2xl:grid @2xl:grid-cols-[minmax(0,1fr)_6rem_7rem_2rem] @2xl:items-center";

interface FileListProps {
  items: ItemSummary[];
}

/** /items/files 的單欄檔案列表；外層頁面是 @container，依頁面寬度切換為表格式排列 */
export function FileList({ items }: FileListProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        aria-hidden
        className={`hidden gap-4 border-b px-4 py-2 text-xs font-medium text-muted-foreground ${COLUMNS}`}
      >
        <span>Name</span>
        <span>Size</span>
        <span>Uploaded</span>
      </div>
      <ul className="divide-y">
        {items.map((item) => (
          <FileRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function FileRow({ item }: { item: ItemSummary }) {
  // 沒有檔案的 item（理論上 FILE 型別都有）仍以標題顯示，只是沒有大小與下載
  const file: ItemFile | null = item.file;
  const fileName = file?.name ?? item.title;
  const size = file ? formatFileSize(file.size) : null;
  const uploaded = formatDate(item.createdAt);

  return (
    <li className="relative transition-colors hover:bg-muted/50">
      <div
        className={`flex items-center gap-3 px-4 py-3 @2xl:gap-4 ${COLUMNS}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* createElement：同 TypeIcon，避開 react-hooks/static-components */}
          {createElement(getFileIcon(fileName), {
            className: "size-5 shrink-0 text-muted-foreground",
            "aria-hidden": true,
          })}
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            {fileName !== item.title && (
              <p className="truncate text-xs text-muted-foreground">
                {fileName}
              </p>
            )}
            {/* 手機：大小與日期疊在名稱下方 */}
            <p className="text-xs text-muted-foreground @2xl:hidden">
              {[size, uploaded].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <span className="hidden text-sm text-muted-foreground @2xl:block">
          {size ?? "—"}
        </span>
        <time
          dateTime={item.createdAt.toISOString()}
          className="hidden text-sm text-muted-foreground @2xl:block"
        >
          {uploaded}
        </time>

        {file ? (
          // z-10 疊在覆蓋整列的按鈕之上；兩者是兄弟元素而非巢狀，點下載不會開啟 drawer
          <a
            href={`/api/items/${encodeURIComponent(item.id)}/file`}
            download={file.name}
            aria-label={`Download ${file.name}`}
            title="Download"
            className={buttonVariants({
              variant: "ghost",
              size: "icon",
              className: "relative z-10 shrink-0",
            })}
          >
            <Download />
          </a>
        ) : (
          <span className="size-8 shrink-0" />
        )}
      </div>
      <ItemCardTrigger id={item.id} title={item.title} />
    </li>
  );
}
