/** Monaco 不認得的語言以純文字顯示 */
export const PLAINTEXT = "plaintext";

/**
 * 常見的別名與副檔名 → Monaco 的語言 id。
 * 名稱本身就是 Monaco id 的語言（python、sql、yaml…）不必列出，見 MONACO_LANGUAGES。
 */
const ALIASES: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  // JSON 的語言服務需要額外的 worker，沒有打包；JSON 是 JavaScript 的子集，借用它的上色
  json: "javascript",
  jsonc: "javascript",
  bash: "shell",
  sh: "shell",
  zsh: "shell",
  terminal: "shell",
  console: "shell",
  ps: "powershell",
  ps1: "powershell",
  pwsh: "powershell",
  py: "python",
  rb: "ruby",
  rs: "rust",
  golang: "go",
  "c++": "cpp",
  cc: "cpp",
  "c#": "csharp",
  cs: "csharp",
  kt: "kotlin",
  yml: "yaml",
  md: "markdown",
  docker: "dockerfile",
  htm: "html",
  scss: "scss",
  gql: "graphql",
  psql: "pgsql",
  postgres: "pgsql",
  postgresql: "pgsql",
  text: PLAINTEXT,
  txt: PLAINTEXT,
};

/**
 * 有打包上色規則的語言 id 與顯示名稱，須與 src/components/items/monaco-setup.ts 引入的語言模組一致；
 * plaintext 為 Monaco 內建
 */
const MONACO_LANGUAGE_LABELS: Record<string, string> = {
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  dart: "Dart",
  dockerfile: "Dockerfile",
  go: "Go",
  graphql: "GraphQL",
  html: "HTML",
  ini: "INI",
  java: "Java",
  javascript: "JavaScript",
  kotlin: "Kotlin",
  less: "Less",
  lua: "Lua",
  markdown: "Markdown",
  mysql: "MySQL",
  pgsql: "PostgreSQL",
  php: "PHP",
  plaintext: "Plain text",
  powershell: "PowerShell",
  python: "Python",
  r: "R",
  ruby: "Ruby",
  rust: "Rust",
  scss: "SCSS",
  shell: "Shell",
  sql: "SQL",
  swift: "Swift",
  typescript: "TypeScript",
  xml: "XML",
  yaml: "YAML",
};

const MONACO_LANGUAGES = new Set(Object.keys(MONACO_LANGUAGE_LABELS));

export interface LanguageOption {
  /** 存進 item.language 的值 */
  value: string;
  label: string;
}

/**
 * Language 下拉選單的選項，依名稱排序。值是 Monaco 的語言 id；
 * JSON 另列一項（上色借用 JavaScript，見 ALIASES），讓使用者選得到、存下來也是 json
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  ...Object.entries(MONACO_LANGUAGE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
  { value: "json", label: "JSON" },
].sort((a, b) => a.label.localeCompare(b.label));

const OPTION_VALUES = new Set(LANGUAGE_OPTIONS.map((option) => option.value));

/**
 * item.language（自由文字）對應到下拉選單的值：選項本身或其別名（ts → typescript）回傳選項的值，
 * 空白回傳 ""（顯示 placeholder），其他不認得的值原樣回傳（trim 後），由選單另列一項保留
 */
export function toLanguageOptionValue(
  language: string | null | undefined,
): string {
  const trimmed = language?.trim() ?? "";
  const key = trimmed.toLowerCase();
  if (!key) {
    return "";
  }
  if (OPTION_VALUES.has(key)) {
    return key;
  }
  const alias = ALIASES[key];
  return alias && OPTION_VALUES.has(alias) ? alias : trimmed;
}

/** Monaco 語言 id 的顯示名稱；沒有對應時原樣回傳 */
export function getLanguageLabel(id: string): string {
  return MONACO_LANGUAGE_LABELS[id] ?? id;
}

/**
 * item 的 language 是使用者自由輸入的文字，轉成 Monaco 的語言 id；
 * 空白時用 fallback（例如 commands 預設 shell），不認得時為純文字。
 */
export function toMonacoLanguage(
  language: string | null | undefined,
  fallback = PLAINTEXT,
): string {
  const key = language?.trim().toLowerCase();
  if (!key) {
    return fallback;
  }
  const id = ALIASES[key] ?? key;
  return MONACO_LANGUAGES.has(id) ? id : PLAINTEXT;
}

/** 沒填語言時：commands 都是終端機指令，以 shell 上色；其他型別為純文字 */
export function getEditorLanguage(
  typeSlug: string,
  language: string | null | undefined,
): string {
  return toMonacoLanguage(
    language,
    typeSlug === "commands" ? "shell" : PLAINTEXT,
  );
}
