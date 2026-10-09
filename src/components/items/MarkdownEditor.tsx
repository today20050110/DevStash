"use client";

import { useId, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

// react-markdown 與 remark-gfm 只在顯示預覽時才下載；Write 分頁是一般 textarea，用不到
const MarkdownPreview = dynamic(
  () => import("@/components/items/MarkdownPreview"),
  {
    loading: () => (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ),
  },
);

type Tab = "write" | "preview";

interface MarkdownEditorProps {
  /** 受控值；唯讀時直接渲染 */
  value: string;
  /** 沒有 onChange 時為唯讀，只顯示 Preview */
  onChange?: (value: string) => void;
  /** Write 分頁 textarea 的 id，讓外層的 <label htmlFor> 對應 */
  id?: string;
  invalid?: boolean;
  /** 錯誤訊息的 id，接到 textarea 的 aria-describedby */
  describedBy?: string;
}

/**
 * notes／prompts 的 Content：編輯時有 Write／Preview 分頁，唯讀時只有 Preview。
 * 外框與標頭沿用 CodeEditor 的樣式（圓點、複製按鈕），高度隨內容伸縮、最高 400px。
 */
export function MarkdownEditor({
  value,
  onChange,
  id,
  invalid = false,
  describedBy,
}: MarkdownEditorProps) {
  const readOnly = !onChange;
  const [tab, setTab] = useState<Tab>(readOnly ? "preview" : "write");
  const { copied, copy } = useCopyToClipboard();
  const tabsId = useId();
  const activeTab = readOnly ? "preview" : tab;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        invalid && "border-destructive",
      )}
    >
      <div className="flex h-9 items-center gap-2 border-b bg-muted/40 px-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </div>
        {readOnly ? (
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            markdown
          </span>
        ) : (
          <div
            role="tablist"
            aria-label="Content mode"
            className="ml-auto flex"
          >
            {(["write", "preview"] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                id={`${tabsId}-${name}-tab`}
                aria-selected={tab === name}
                aria-controls={`${tabsId}-${name}`}
                onClick={() => setTab(name)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs capitalize text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                  tab === name && "bg-muted text-foreground",
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => copy(value)}
          aria-label={copied ? "Copied" : "Copy content"}
          title={copied ? "Copied" : "Copy content"}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      {activeTab === "write" ? (
        <div
          id={`${tabsId}-write`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-write-tab`}
        >
          <textarea
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            spellCheck={false}
            placeholder="Write in Markdown…"
            className="scrollbar-subtle block field-sizing-content max-h-[400px] min-h-40 w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : (
        <div
          id={readOnly ? undefined : `${tabsId}-preview`}
          role={readOnly ? undefined : "tabpanel"}
          aria-labelledby={readOnly ? undefined : `${tabsId}-preview-tab`}
          className={cn(
            "scrollbar-subtle max-h-[400px] overflow-auto px-4 py-3",
            !readOnly && "min-h-40",
          )}
        >
          {value.trim() ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
