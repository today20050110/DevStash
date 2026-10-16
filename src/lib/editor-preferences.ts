import { z } from "zod";

/** 設定頁下拉選單的選項；也是 server action 接受的合法值 */
export const EDITOR_FONT_SIZES = [12, 13, 14, 16, 18, 20] as const;
export const EDITOR_TAB_SIZES = [2, 4, 8] as const;
export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;

export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const EDITOR_THEME_LABELS: Record<EditorTheme, string> = {
  "vs-dark": "VS Dark",
  monokai: "Monokai",
  "github-dark": "GitHub Dark",
};

export const editorPreferencesSchema = z.object(
  {
    fontSize: z.literal(EDITOR_FONT_SIZES),
    tabSize: z.literal(EDITOR_TAB_SIZES),
    wordWrap: z.boolean(),
    minimap: z.boolean(),
    theme: z.enum(EDITOR_THEMES),
  },
  { error: "Invalid editor preferences" },
);

export type EditorPreferences = z.output<typeof editorPreferencesSchema>;

/** 字級與 tab 沿用功能上線前寫死的值，預設外觀不變 */
export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
};

/**
 * 把資料庫的 JSON 欄位轉成完整的偏好。資料庫只存使用者寫入過的值（可能為 null），
 * 預設值在讀取時補上：缺少或不合法的欄位逐一改用預設值，其他欄位照常保留，
 * 日後新增欄位或改預設值都不需要 migration。
 */
export function parseEditorPreferences(value: unknown): EditorPreferences {
  const stored =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const { shape } = editorPreferencesSchema;
  const field = <K extends keyof EditorPreferences>(key: K) => {
    const parsed = shape[key].safeParse(stored[key]);
    return (
      parsed.success ? parsed.data : DEFAULT_EDITOR_PREFERENCES[key]
    ) as EditorPreferences[K];
  };

  return {
    fontSize: field("fontSize"),
    tabSize: field("tabSize"),
    wordWrap: field("wordWrap"),
    minimap: field("minimap"),
    theme: field("theme"),
  };
}

/** 行高隨字級縮放；預設字級 13 時為 20px，與功能上線前相同 */
export function getEditorLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.5);
}
