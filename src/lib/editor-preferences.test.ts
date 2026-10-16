import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  editorPreferencesSchema,
  getEditorLineHeight,
  parseEditorPreferences,
} from "@/lib/editor-preferences";

const CUSTOM = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
} as const;

describe("parseEditorPreferences", () => {
  it("資料庫為 null（從未儲存過）時回傳預設值", () => {
    expect(parseEditorPreferences(null)).toEqual(DEFAULT_EDITOR_PREFERENCES);
  });

  it("完整且合法的值原樣保留", () => {
    expect(parseEditorPreferences(CUSTOM)).toEqual(CUSTOM);
  });

  it("缺少的欄位補上預設值，其他欄位保留", () => {
    expect(parseEditorPreferences({ theme: "github-dark" })).toEqual({
      ...DEFAULT_EDITOR_PREFERENCES,
      theme: "github-dark",
    });
  });

  it("不合法的欄位逐一改用預設值，不影響合法的欄位", () => {
    expect(
      parseEditorPreferences({
        ...CUSTOM,
        fontSize: 15,
        tabSize: "4",
        theme: "solarized",
      }),
    ).toEqual({
      ...CUSTOM,
      fontSize: DEFAULT_EDITOR_PREFERENCES.fontSize,
      tabSize: DEFAULT_EDITOR_PREFERENCES.tabSize,
      theme: DEFAULT_EDITOR_PREFERENCES.theme,
    });
  });

  it("多餘的欄位被丟掉", () => {
    expect(parseEditorPreferences({ ...CUSTOM, extra: 1 })).toEqual(CUSTOM);
  });

  it.each([["string"], [42], [[1, 2]], [true]])(
    "不是物件（%j）時回傳預設值",
    (value) => {
      expect(parseEditorPreferences(value)).toEqual(DEFAULT_EDITOR_PREFERENCES);
    },
  );
});

describe("editorPreferencesSchema", () => {
  it("預設值本身是合法的", () => {
    expect(
      editorPreferencesSchema.safeParse(DEFAULT_EDITOR_PREFERENCES).success,
    ).toBe(true);
  });

  it("只接受選單提供的字級與 tab size", () => {
    expect(
      editorPreferencesSchema.safeParse({ ...CUSTOM, fontSize: 100 }).success,
    ).toBe(false);
    expect(
      editorPreferencesSchema.safeParse({ ...CUSTOM, tabSize: 3 }).success,
    ).toBe(false);
  });
});

describe("getEditorLineHeight", () => {
  it("預設字級 13 維持原本的 20px 行高", () => {
    expect(getEditorLineHeight(13)).toBe(20);
  });

  it("隨字級縮放", () => {
    expect(getEditorLineHeight(20)).toBe(30);
  });
});
