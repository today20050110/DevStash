"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useTagOptions } from "@/components/items/TagOptionsProvider";
import { Input } from "@/components/ui/input";
import { applyTagSuggestion, suggestTags } from "@/lib/tags";
import { cn } from "@/lib/utils";

interface TagInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** errorProps 產生的 aria-invalid、aria-describedby */
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/**
 * 逗號分隔的 Tags 欄位，輸入時建議既有標籤（WAI-ARIA combobox，list autocomplete）。
 * 仍可自由輸入新標籤；選取建議只是取代目前正在輸入的片段
 */
export function TagInput({ id, value, onChange, ...ariaProps }: TagInputProps) {
  const options = useTagOptions();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const suggestions = open ? suggestTags(value, options) : [];
  const expanded = suggestions.length > 0;
  const activeIndex = active < suggestions.length ? active : -1;

  // Esc 只關閉建議清單。外層的 Dialog／Sheet 在 document 的捕獲階段監聽 Esc，
  // 在輸入框上 stopPropagation 來不及，所以清單開著時在更早的 window 捕獲階段攔下
  useEffect(() => {
    if (!expanded) return;
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [expanded]);

  function update(next: string) {
    onChange(next);
    setOpen(true);
    setActive(-1);
  }

  function pick(name: string) {
    update(applyTagSuggestion(value, name));
    // 選取後清單關閉，等使用者輸入下一個片段再開
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!expanded) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + suggestions.length) % suggestions.length);
    } else if ((event.key === "Enter" || event.key === "Tab") && activeIndex >= 0) {
      // 沒有反白項目時 Enter 照常送出表單、Tab 照常移動焦點
      event.preventDefault();
      pick(suggestions[activeIndex].name);
    }
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        {...ariaProps}
        role="combobox"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        autoComplete="off"
        value={value}
        onChange={(event) => update(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        placeholder="react, hooks, auth"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Tag suggestions"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-md"
      >
        {suggestions.map((option, index) => (
          <li
            key={option.name}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            // mousedown 而非 click：避免輸入框先 blur 把清單關掉
            onMouseDown={(event) => {
              event.preventDefault();
              pick(option.name);
            }}
            onMouseEnter={() => setActive(index)}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5",
              index === activeIndex && "bg-accent text-accent-foreground",
            )}
          >
            <span className="truncate">{option.name}</span>
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">
              {option.itemCount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
