"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { optimizePrompt } from "@/actions/ai";
import { AiHeaderButton } from "@/components/items/AiHeaderButton";
import type { OptimizePromptInput } from "@/lib/ai-inputs";
import type { OptimizedPrompt } from "@/lib/ai-optimize";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";

export const PROMPT_ALREADY_GOOD_MESSAGE = "This prompt already looks good";

interface OptimizePromptButtonProps {
  input: OptimizePromptInput;
  isPro: boolean;
  /** 有改寫時呼叫，由 MarkdownEditor 顯示建議並詢問是否採用 */
  onOptimized: (result: OptimizedPrompt) => void;
}

/** MarkdownEditor 標頭的 AI 優化按鈕（Copy 旁）；不需要修改時只以 toast 告知 */
export function OptimizePromptButton({
  input,
  isPro,
  onOptimized,
}: OptimizePromptButtonProps) {
  const [pending, startTransition] = useTransition();

  function optimize() {
    startTransition(async () => {
      const result = await callServerAction(() => optimizePrompt(input));
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        toast.error(result.error);
        return;
      }
      if (!result.data.improved) {
        toast.success(PROMPT_ALREADY_GOOD_MESSAGE, {
          description: result.data.summary || undefined,
        });
        return;
      }
      onOptimized(result.data);
    });
  }

  return (
    <AiHeaderButton
      isPro={isPro}
      label="Optimize prompt with AI"
      pendingLabel="Optimizing prompt"
      pending={pending}
      onClick={optimize}
    />
  );
}
