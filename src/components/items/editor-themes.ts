import type { BeforeMount } from "@monaco-editor/react";

import type { EditorTheme } from "@/lib/editor-preferences";

type Monaco = Parameters<BeforeMount>[0];
type ThemeData = Parameters<Monaco["editor"]["defineTheme"]>[1];

/** Monaco 的主題是全域註冊的名稱；加上前綴避免與內建的 vs-dark 衝突 */
export const MONACO_THEME_NAMES: Record<EditorTheme, string> = {
  "vs-dark": "devstash-dark",
  monokai: "devstash-monokai",
  "github-dark": "devstash-github-dark",
};

/** 三個主題共用：不畫焦點框與捲軸陰影，捲軸用半透明白 */
const SHARED_COLORS = {
  "editor.lineHighlightBorder": "#00000000",
  focusBorder: "#00000000",
  "scrollbar.shadow": "#00000000",
  "scrollbarSlider.background": "#ffffff1f",
  "scrollbarSlider.hoverBackground": "#ffffff33",
  "scrollbarSlider.activeBackground": "#ffffff47",
};

/** Monaco 的色彩只吃 hex，token 的 foreground 不含 # */
const THEMES: Record<EditorTheme, ThemeData> = {
  // 功能上線前唯一的主題：背景、邊框對齊 globals.css 的深色 token（card／muted）
  "vs-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      ...SHARED_COLORS,
      "editor.background": "#171717",
      "editorGutter.background": "#171717",
      "editor.lineHighlightBackground": "#ffffff0a",
      "editorLineNumber.foreground": "#525252",
      "editorLineNumber.activeForeground": "#a3a3a3",
      "editorWidget.background": "#262626",
      "editorWidget.border": "#ffffff1a",
    },
  },
  monokai: {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "f8f8f2" },
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "keyword", foreground: "f92672" },
      { token: "operator", foreground: "f92672" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "constant", foreground: "ae81ff" },
      { token: "regexp", foreground: "e6db74" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "type.identifier", foreground: "a6e22e" },
      { token: "predefined", foreground: "66d9ef" },
      { token: "variable", foreground: "fd971f" },
      { token: "tag", foreground: "f92672" },
      { token: "attribute.name", foreground: "a6e22e" },
      { token: "attribute.value", foreground: "e6db74" },
      { token: "delimiter", foreground: "f8f8f2" },
    ],
    colors: {
      ...SHARED_COLORS,
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorGutter.background": "#272822",
      "editor.lineHighlightBackground": "#3e3d32",
      "editor.selectionBackground": "#49483e",
      "editorCursor.foreground": "#f8f8f0",
      "editorLineNumber.foreground": "#90908a",
      "editorLineNumber.activeForeground": "#f8f8f2",
      "editorWidget.background": "#1e1f1c",
      "editorWidget.border": "#ffffff1a",
    },
  },
  "github-dark": {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e6edf3" },
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "operator", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "constant", foreground: "79c0ff" },
      { token: "regexp", foreground: "7ee787" },
      { token: "type", foreground: "ffa657" },
      { token: "type.identifier", foreground: "ffa657" },
      { token: "predefined", foreground: "d2a8ff" },
      { token: "variable", foreground: "ffa657" },
      { token: "tag", foreground: "7ee787" },
      { token: "attribute.name", foreground: "79c0ff" },
      { token: "attribute.value", foreground: "a5d6ff" },
      { token: "delimiter", foreground: "e6edf3" },
    ],
    colors: {
      ...SHARED_COLORS,
      "editor.background": "#0d1117",
      "editor.foreground": "#e6edf3",
      "editorGutter.background": "#0d1117",
      "editor.lineHighlightBackground": "#6e76811a",
      "editor.selectionBackground": "#264f78",
      "editorCursor.foreground": "#e6edf3",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#e6edf3",
      "editorWidget.background": "#161b22",
      "editorWidget.border": "#30363d",
    },
  },
};

/** 在第一個編輯器掛載前註冊全部主題，之後切換只需改 theme prop */
export const defineEditorThemes: BeforeMount = (monaco) => {
  for (const theme of Object.keys(THEMES) as EditorTheme[]) {
    monaco.editor.defineTheme(MONACO_THEME_NAMES[theme], THEMES[theme]);
  }
};
