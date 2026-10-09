"use client";

import { useId, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { isHttpUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

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

/**
 * 不渲染原始 HTML（未加 rehype-raw）；連結與圖片只接受 http(s)，
 * 相對路徑與其他 scheme 以純文字顯示，避免對本站發出請求或執行程式碼。
 */
const MARKDOWN_COMPONENTS: Components = {
  a: ({ href, children }) =>
    href && isHttpUrl(href) ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ src, alt }) =>
    typeof src === "string" && isHttpUrl(src) ? (
      // 使用者內容中的任意外部圖片，無法事先設定 next/image 的 remotePatterns
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    ) : (
      <span>{alt}</span>
    ),
};

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
