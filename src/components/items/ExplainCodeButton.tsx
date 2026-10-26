"use client";

import { useTransition } from "react";
import { Crown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { explainCode } from "@/actions/ai";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExplainCodeInput } from "@/lib/ai-inputs";
import { AI_PRO_MESSAGE } from "@/lib/plan";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

interface ExplainCodeButtonProps {
  input: ExplainCodeInput;
  isPro: boolean;
  /** 產生成功時呼叫，由 CodeEditor 切到 Explain 分頁 */
  onExplained: (explanation: string) => void;
}

/**
 * CodeEditor 標頭的 AI 解說按鈕（Copy 旁）。Pro 每次點擊都重新產生；
 * Free 顯示 Crown 與說明需要 Pro 的 tooltip，不呼叫 action（伺服器端仍會擋）
 */
export function ExplainCodeButton({
  input,
  isPro,
  onExplained,
}: ExplainCodeButtonProps) {
  const [pending, startTransition] = useTransition();

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
              aria-label={`Explain code. ${AI_PRO_MESSAGE}`}
            >
              <Crown />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{AI_PRO_MESSAGE}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  function explain() {
    startTransition(async () => {
      const result = await callServerAction(() => explainCode(input));
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        toast.error(result.error);
        return;
      }
      onExplained(result.data);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="relative pointer-coarse:hit-area"
      onClick={explain}
      disabled={pending}
      aria-label={pending ? "Explaining code" : "Explain code with AI"}
      title="Explain code with AI"
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
    </Button>
  );
}
