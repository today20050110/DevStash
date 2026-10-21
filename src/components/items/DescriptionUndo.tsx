"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** AI 覆蓋前的描述，以及覆蓋後的結果 */
interface Replacement {
  previous: string;
  generated: string;
}

/**
 * AI 產生的描述直接覆蓋 Description 欄位；原本有內容時記住舊值供 Undo。
 * 使用者之後自己改了欄位（值不再是 generated），Undo 就不再適用
 */
export function useDescriptionReplacement(
  value: string,
  onChange: (value: string) => void,
) {
  const [replacement, setReplacement] = useState<Replacement | null>(null);

  function replace(generated: string) {
    setReplacement(value.trim() === "" ? null : { previous: value, generated });
    onChange(generated);
  }

  function undo() {
    if (replacement) {
      onChange(replacement.previous);
      setReplacement(null);
    }
  }

  return {
    replace,
    undo,
    canUndo: replacement !== null && replacement.generated === value,
  };
}

/**
 * Description 欄位下方的 Undo。不放在 toast：drawer 與 dialog 會擋住外面的點擊
 * （點了還會關閉它們），toast 的按鈕按不到
 */
export function DescriptionUndo({ onUndo }: { onUndo: () => void }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span role="status">Description replaced by AI.</span>
      <Button type="button" variant="ghost" size="xs" onClick={onUndo}>
        <Undo2 />
        Undo
      </Button>
    </div>
  );
}
