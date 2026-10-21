"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEditorLanguage,
  getLanguageLabel,
  LANGUAGE_OPTIONS,
  toLanguageOptionValue,
} from "@/lib/code-language";

interface LanguageSelectProps {
  id: string;
  /** item.language 的目前值（自由文字，可能是別名或空白） */
  value: string;
  onChange: (value: string) => void;
  /** 型別的 slug，沒選語言時的 placeholder 顯示該型別的預設（commands 為 Shell） */
  typeSlug: string;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * snippets／commands 的語言選單。選項是有上色規則的語言；
 * 既有 item 存了不認得的語言時另列一項，使用者沒改就不會被換掉
 */
export function LanguageSelect({
  id,
  value,
  onChange,
  typeSlug,
  invalid = false,
  describedBy,
}: LanguageSelectProps) {
  const selected = toLanguageOptionValue(value);
  const isCustom =
    selected !== "" &&
    !LANGUAGE_OPTIONS.some((option) => option.value === selected);
  const placeholder = getLanguageLabel(getEditorLanguage(typeSlug, ""));

  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className="w-full sm:w-56"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isCustom && <SelectItem value={selected}>{selected}</SelectItem>}
        {LANGUAGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
