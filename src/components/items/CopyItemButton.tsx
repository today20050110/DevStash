"use client";

import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { fetchItemDetail } from "@/lib/item-api";
import { getCopyValue } from "@/lib/item-copy";

interface CopyItemButtonProps {
  id: string;
  title: string;
}

/** 列表查詢不載入 content；點擊時才向 drawer 用的 API 取得完整資料 */
async function loadCopyValue(id: string): Promise<string> {
  const value = getCopyValue(await fetchItemDetail(id));
  if (!value) {
    throw new Error("Nothing to copy");
  }
  return value;
}

/**
 * 卡片上的快速複製。與覆蓋整張卡片的 ItemCardTrigger 是兄弟元素，
 * 以 relative z-10 疊在它之上，點擊不會開啟 drawer。
 */
export function CopyItemButton({ id, title }: CopyItemButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  async function handleClick() {
    // 不先 await 載入：promise 直接交給剪貼簿 API，保留使用者手勢
    const success = await copy(loadCopyValue(id));
    if (!success) {
      toast.error(`Couldn't copy "${title}"`);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      aria-label={copied ? "Copied" : `Copy ${title}`}
      title="Copy"
      className="relative z-10 -my-1 shrink-0 text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}
