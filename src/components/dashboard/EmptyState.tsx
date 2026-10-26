import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** 告訴使用者怎麼開始，例如用哪個按鈕新增 */
  hint: string;
}

/** 列表頁沒有資料時的提示：圖示、標題與下一步 */
export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <div className="text-muted-foreground [&_svg]:size-8" aria-hidden>
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
