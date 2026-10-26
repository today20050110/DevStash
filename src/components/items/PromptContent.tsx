"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";

import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { OptimizePromptButton } from "@/components/items/OptimizePromptButton";
import { Button } from "@/components/ui/button";
import type { OptimizePromptInput } from "@/lib/ai-inputs";
import type { OptimizedPrompt } from "@/lib/ai-optimize";

interface PromptContentProps {
  input: OptimizePromptInput;
  isPro: boolean;
  /** 使用者採用建議時呼叫：drawer 進入編輯模式並填入新內容，按 Save 才儲存 */
  onUseOptimized: (prompt: string) => void;
}

/**
 * drawer 中 prompt 的 Content：唯讀的 Markdown 加上標頭的 Optimize 按鈕。
 * 產生建議後，原文保留在上方，建議顯示在下方並詢問是否採用；建議不存進資料庫
 */
export function PromptContent({
  input,
  isPro,
  onUseOptimized,
}: PromptContentProps) {
  const [suggestion, setSuggestion] = useState<OptimizedPrompt | null>(null);

  return (
    <div className="space-y-3">
      <MarkdownEditor
        value={input.content}
        headerAction={
          <OptimizePromptButton
            input={input}
            isPro={isPro}
            onOptimized={setSuggestion}
          />
        }
      />
      {suggestion && (
        <section
          aria-label="Optimized prompt"
          className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3"
        >
          <h4 className="flex items-center gap-1.5 text-sm font-medium [&_svg]:size-3.5">
            <Sparkles />
            Optimized prompt
          </h4>
          {suggestion.summary && (
            <p className="text-sm text-muted-foreground">
              {suggestion.summary}
            </p>
          )}
          <MarkdownEditor value={suggestion.prompt} />
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <span className="mr-auto text-xs text-muted-foreground">
              Use this prompt? You can review it before saving.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSuggestion(null)}
            >
              <X />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onUseOptimized(suggestion.prompt)}
            >
              <Check />
              Use this prompt
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
