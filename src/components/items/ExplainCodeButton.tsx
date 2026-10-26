"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { explainCode } from "@/actions/ai";
import { AiHeaderButton } from "@/components/items/AiHeaderButton";
import type { ExplainCodeInput } from "@/lib/ai-inputs";
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

/** CodeEditor 標頭的 AI 解說按鈕（Copy 旁），每次點擊都重新產生 */
export function ExplainCodeButton({
  input,
  isPro,
  onExplained,
}: ExplainCodeButtonProps) {
  const [pending, startTransition] = useTransition();

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
    <AiHeaderButton
      isPro={isPro}
      label="Explain code with AI"
      pendingLabel="Explaining code"
      pending={pending}
      onClick={explain}
    />
  );
}
