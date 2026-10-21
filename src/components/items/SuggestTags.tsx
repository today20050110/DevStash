"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { generateAutoTags } from "@/actions/ai";
import { useIsPro } from "@/components/billing/PlanProvider";
import { Button } from "@/components/ui/button";
import {
  callServerAction,
  SERVER_UNREACHABLE_MESSAGE,
} from "@/lib/server-action";
import { dedupeTagNames, parseTagInput, toTagSlug } from "@/lib/tags";

interface SuggestTagsProps {
  title: string;
  content: string;
  /** Tags 欄位目前的逗號分隔值 */
  tags: string;
  onTagsChange: (tags: string) => void;
}

/**
 * Tags 欄位下方的 AI 標籤建議（Pro 限定，Free 不顯示）。
 * 建議以 badge 呈現，逐一接受（加入 Tags 欄位）或拒絕；已在欄位裡的標籤不再列出
 */
export function SuggestTags({
  title,
  content,
  tags,
  onTagsChange,
}: SuggestTagsProps) {
  const isPro = useIsPro();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  if (!isPro) {
    return null;
  }

  const currentSlugs = new Set(parseTagInput(tags).map(toTagSlug));
  const visible = suggestions.filter(
    (tag) => !currentSlugs.has(toTagSlug(tag)),
  );
  const isEmpty = title.trim() === "" && content.trim() === "";

  function suggest() {
    startTransition(async () => {
      const result = await callServerAction(() =>
        generateAutoTags({ title, content }),
      );
      if (!result) {
        toast.error(SERVER_UNREACHABLE_MESSAGE);
        return;
      }
      if (!result.success || !result.data) {
        toast.error(result.error);
        return;
      }
      if (result.data.length === 0) {
        toast.info("No tag suggestions for this item");
      }
      setSuggestions(result.data);
    });
  }

  function accept(tag: string) {
    onTagsChange(dedupeTagNames([...parseTagInput(tags), tag]).join(", "));
    dismiss(tag);
  }

  function dismiss(tag: string) {
    setSuggestions((current) => current.filter((item) => item !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={suggest}
        disabled={pending || isEmpty}
        title={isEmpty ? "Add a title or content first" : undefined}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        Suggest Tags
      </Button>
      {visible.length > 0 && (
        <ul aria-label="Suggested tags" className="flex flex-wrap gap-1.5">
          {visible.map((tag) => (
            <li
              key={tag}
              className="inline-flex h-7 items-center gap-0.5 rounded-full border border-dashed pr-0.5 pl-2.5 text-xs"
            >
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="relative rounded-full text-emerald-500 pointer-coarse:hit-area hover:text-emerald-400"
                onClick={() => accept(tag)}
                aria-label={`Add tag ${tag}`}
                title="Add tag"
              >
                <Check />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="relative rounded-full text-muted-foreground pointer-coarse:hit-area"
                onClick={() => dismiss(tag)}
                aria-label={`Dismiss tag ${tag}`}
                title="Dismiss"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
