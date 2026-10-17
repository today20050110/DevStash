import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { tagHref } from "@/lib/tags";

interface TagLinkProps {
  name: string;
  className?: string;
  /** drawer 內點擊時關閉 drawer；server component（卡片）不傳 */
  onClick?: () => void;
}

/** 連到標籤頁的標籤 badge；卡片與 drawer 共用 */
export function TagLink({ name, className, onClick }: TagLinkProps) {
  return (
    // secondary variant 已內建 [a]:hover 的底色變化
    <Badge asChild variant="secondary" className={className}>
      <Link href={tagHref(name)} onClick={onClick}>
        {name}
      </Link>
    </Badge>
  );
}
