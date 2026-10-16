"use client";

import type { ReactNode } from "react";

import { useEditorPreferences } from "@/components/settings/EditorPreferencesProvider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  EDITOR_FONT_SIZES,
  EDITOR_TAB_SIZES,
  EDITOR_THEME_LABELS,
  EDITOR_THEMES,
  type EditorPreferences,
} from "@/lib/editor-preferences";

/** 沒有儲存按鈕：每次變更由 EditorPreferencesProvider 自動儲存並顯示 toast */
export function EditorPreferencesForm() {
  const { preferences, updatePreference } = useEditorPreferences();

  return (
    <div className="divide-y">
      <PreferenceRow
        id="editor-font-size"
        label="Font size"
        description="Text size in the code editor."
      >
        <Select
          value={String(preferences.fontSize)}
          onValueChange={(value) =>
            updatePreference(
              "fontSize",
              Number(value) as EditorPreferences["fontSize"],
            )
          }
        >
          <SelectTrigger id="editor-font-size" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id="editor-tab-size"
        label="Tab size"
        description="Number of spaces per indentation level."
      >
        <Select
          value={String(preferences.tabSize)}
          onValueChange={(value) =>
            updatePreference(
              "tabSize",
              Number(value) as EditorPreferences["tabSize"],
            )
          }
        >
          <SelectTrigger id="editor-tab-size" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_TAB_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} spaces
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id="editor-theme"
        label="Theme"
        description="Color theme for the code editor."
      >
        <Select
          value={preferences.theme}
          onValueChange={(value) =>
            updatePreference("theme", value as EditorPreferences["theme"])
          }
        >
          <SelectTrigger id="editor-theme" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_THEMES.map((theme) => (
              <SelectItem key={theme} value={theme}>
                {EDITOR_THEME_LABELS[theme]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PreferenceRow>

      <PreferenceRow
        id="editor-word-wrap"
        label="Word wrap"
        description="Wrap long lines instead of scrolling horizontally."
      >
        <Switch
          id="editor-word-wrap"
          checked={preferences.wordWrap}
          onCheckedChange={(checked) => updatePreference("wordWrap", checked)}
        />
      </PreferenceRow>

      <PreferenceRow
        id="editor-minimap"
        label="Minimap"
        description="Show a code overview on the right edge of the editor."
      >
        <Switch
          id="editor-minimap"
          checked={preferences.minimap}
          onCheckedChange={(checked) => updatePreference("minimap", checked)}
        />
      </PreferenceRow>
    </div>
  );
}

function PreferenceRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
