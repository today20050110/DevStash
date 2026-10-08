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
 * 有打包上色規則的語言 id，須與 src/components/items/monaco-setup.ts 引入的語言模組一致；
 * plaintext 為 Monaco 內建
 */
const MONACO_LANGUAGES = new Set([
  "c",
  "cpp",
  "csharp",
  "css",
  "dart",
  "dockerfile",
  "go",
  "graphql",
  "html",
  "ini",
  "java",
  "javascript",
  "kotlin",
  "less",
  "lua",
  "markdown",
  "mysql",
  "pgsql",
  "php",
  "plaintext",
  "powershell",
  "python",
  "r",
  "ruby",
  "rust",
  "scss",
  "shell",
  "sql",
  "swift",
  "typescript",
  "xml",
  "yaml",
]);

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
