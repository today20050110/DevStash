"use client";

import { Crown, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AI_PRO_MESSAGE } from "@/lib/plan";

interface AiHeaderButtonProps {
  isPro: boolean;
  /** 按鈕的名稱，例如「Explain code with AI」 */
  label: string;
  /** 產生中的名稱，例如「Explaining code」 */
  pendingLabel: string;
  pending: boolean;
  onClick: () => void;
}

/**
 * 編輯器標頭的 AI 圖示按鈕（Explain、Optimize 共用）。Pro 顯示 Sparkles，產生中換成 Loader2；
 * Free 顯示 Crown 與說明需要 Pro 的 tooltip，不呼叫 action（伺服器端仍會擋）
 */
export function AiHeaderButton({
  isPro,
  label,
  pendingLabel,
  pending,
  onClick,
}: AiHeaderButtonProps) {
  if (!isPro) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="relative text-muted-foreground pointer-coarse:hit-area"
              aria-disabled
              aria-label={`${label}. ${AI_PRO_MESSAGE}`}
            >
              <Crown />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{AI_PRO_MESSAGE}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="relative pointer-coarse:hit-area"
      onClick={onClick}
      disabled={pending}
      aria-label={pending ? pendingLabel : label}
      title={label}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
    </Button>
  );
}
