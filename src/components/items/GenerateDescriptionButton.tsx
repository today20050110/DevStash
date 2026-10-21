"use client";

import { useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateDescription } from "@/actions/ai";
import { useIsPro } from "@/components/billing/PlanProvider";
import { Button } from "@/components/ui/button";
import { hasDescribableContent, type DescriptionInput } from "@/lib/ai-inputs";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";
import { cn } from "@/lib/utils";

interface GenerateDescriptionButtonProps {
  /** 表單上目前的值，不需要先儲存 */
  input: DescriptionInput;
  /** 產生成功時呼叫，由 DescriptionField 填入欄位並提供 Undo */
  onGenerated: (description: string) => void;
  className?: string;
}

/**
 * Description 標題列右側的 AI 按鈕（Pro 限定，Free 不顯示）：依表單目前的內容產生 1–2 句描述。
 * 放在標題列而不是欄位內，避免看起來像是 Title 的按鈕；與 Suggest Tags 一樣是帶文字的 ghost 按鈕
 */
export function GenerateDescriptionButton({
  input,
  onGenerated,
  className,
}: GenerateDescriptionButtonProps) {
  const isPro = useIsPro();
  const [pending, startTransition] = useTransition();

  if (!isPro) {
    return null;
  }

  const isEmpty = !hasDescribableContent(input);
  // 可見文字只有 Generate，螢幕閱讀器的名稱補上對象（名稱包含可見文字，語音操作仍可用「Generate」）
  const title = isEmpty
    ? "Add a title or content to generate a description"
    : "Generate a description with AI";

  function generate() {
    startTransition(async () => {
      const result = await callServerAction(() => generateDescription(input));
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        toast.error(result.error);
        return;
      }
      onGenerated(result.data);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      // -my-1：按鈕比標題文字高，抵銷後標題列的高度與其他欄位一致
      className={cn("relative -my-1 pointer-coarse:hit-area", className)}
      onClick={generate}
      disabled={pending || isEmpty}
      aria-label="Generate description"
      title={title}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      Generate
    </Button>
  );
}
