"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import { Check, Copy } from "lucide-react";

import {
  defineEditorThemes,
  MONACO_THEME_NAMES,
} from "@/components/items/editor-themes";
import { useEditorPreferences } from "@/components/settings/EditorPreferencesProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { getEditorLineHeight } from "@/lib/editor-preferences";
import { cn } from "@/lib/utils";

// monaco-editor 載入時就存取 window，只能在瀏覽器端載入；也讓數 MB 的 monaco
// 只在第一次顯示程式碼編輯器時才下載，不進其他頁面的 bundle
const Editor = dynamic(() => import("@/components/items/MonacoEditor"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const MAX_HEIGHT = 400;
/** 編輯模式的最低高度，與原本 Textarea 的 min-h-40 相同 */
const EDIT_MIN_HEIGHT = 160;
const VERTICAL_PADDING = 12;

interface CodeEditorProps {
  /** 唯讀時隨 prop 更新；編輯時只作為初始值，之後以 onChange 回報 */
  value: string;
  /** Monaco 的語言 id（getEditorLanguage） */
  language: string;
  /** 標頭顯示的語言名稱；預設為 language */
  languageLabel?: string;
  /** 沒有 onChange 時為唯讀 */
  onChange?: (value: string) => void;
  /** 螢幕閱讀器用的名稱，Monaco 的輸入框無法以 <label htmlFor> 對應 */
  ariaLabel: string;
  invalid?: boolean;
}

/**
 * Monaco Editor 加上 macOS 視窗樣式的標頭（圓點、語言、複製）。
 * Monaco 由專案本機打包（見 monaco-setup.ts），不連外部 CDN；載入完成前顯示骨架。
 * 高度隨內容伸縮、最高 400px，超過時在編輯器內捲動。
 */
export function CodeEditor({
  value,
  language,
  languageLabel = language,
  onChange,
  ariaLabel,
  invalid = false,
}: CodeEditorProps) {
  const readOnly = !onChange;
  const { preferences } = useEditorPreferences();
  const lineHeight = getEditorLineHeight(preferences.fontSize);
  const minHeight = readOnly ? 0 : EDIT_MIN_HEIGHT;
  const [height, setHeight] = useState(() =>
    clampHeight(estimateHeight(value, lineHeight), minHeight),
  );
  const { copied, copy } = useCopyToClipboard();

  const handleMount: OnMount = (editor) => {
    setHeight(clampHeight(editor.getContentHeight(), minHeight));
    editor.onDidContentSizeChange(({ contentHeight }) => {
      setHeight(clampHeight(contentHeight, minHeight));
    });
  };

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
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {languageLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="relative pointer-coarse:hit-area"
          onClick={() => copy(value)}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      {/* 高度由內容決定，無法寫成固定的 Tailwind class；載入中的骨架也沿用同一高度 */}
      <div style={{ height }}>
        <Editor
          height="100%"
          language={language}
          // 編輯模式不受控：若每次按鍵都經 state 再傳回 value，下一個按鍵比重新渲染早到時，
          // 套件會以舊的 value 覆寫編輯器內容而吃掉字元（實測快速輸入時發生）。
          // 父層不會在編輯中從外部改動內容（新增 dialog 關閉時整個卸載）
          {...(readOnly ? { value } : { defaultValue: value })}
          onChange={(next) => onChange?.(next ?? "")}
          theme={MONACO_THEME_NAMES[preferences.theme]}
          beforeMount={defineEditorThemes}
          onMount={handleMount}
          options={{
            ariaLabel,
            readOnly,
            domReadOnly: readOnly,
            renderLineHighlight: readOnly ? "none" : "line",
            fontSize: preferences.fontSize,
            lineHeight,
            padding: { top: VERTICAL_PADDING, bottom: VERTICAL_PADDING },
            minimap: { enabled: preferences.minimap },
            scrollBeyondLastLine: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            folding: false,
            lineNumbersMinChars: 3,
            automaticLayout: true,
            tabSize: preferences.tabSize,
            wordWrap: preferences.wordWrap ? "on" : "off",
            contextmenu: false,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
              // 捲到頂或底時讓滾輪交給 drawer／dialog，否則游標停在編輯器上就無法捲動頁面
              alwaysConsumeMouseWheel: false,
            },
          }}
        />
      </div>
    </div>
  );
}

function estimateHeight(value: string, lineHeight: number): number {
  return value.split("\n").length * lineHeight + VERTICAL_PADDING * 2;
}

function clampHeight(contentHeight: number, minHeight: number): number {
  return Math.min(MAX_HEIGHT, Math.max(minHeight, contentHeight));
}
