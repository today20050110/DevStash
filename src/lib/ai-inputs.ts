/**
 * AI 功能的輸入型別與檢查，client 元件與 server 共用。
 * 刻意不引入 openai SDK（見 docs/ai-integration-plan.md §3.1），client 元件引入這裡不會把 SDK 打包進前端
 */

/** 產生描述時表單上目前的值；依型別只有部分欄位有內容 */
export interface DescriptionInput {
  /** 型別的 slug，例如 snippets、links */
  type: string;
  title: string;
  content: string;
  language: string;
  url: string;
  fileName: string;
}

/** 有沒有可以描述的東西；型別與語言本身不夠 */
export function hasDescribableContent(input: DescriptionInput): boolean {
  return [input.title, input.content, input.url, input.fileName].some(
    (value) => value.trim() !== "",
  );
}

/** 可以用 AI 解說的型別（依 slug）：真正的程式碼與終端機指令，其他型別本來就是給人讀的 */
export const EXPLAINABLE_TYPE_SLUGS = ["snippets", "commands"] as const;

/** 解說程式碼時 drawer 上的 item；item 已儲存，但沿用其他 AI 功能「送目前的值」的做法 */
export interface ExplainCodeInput {
  type: (typeof EXPLAINABLE_TYPE_SLUGS)[number];
  title: string;
  language: string;
  content: string;
}

export function isExplainableType(
  slug: string,
): slug is ExplainCodeInput["type"] {
  return (EXPLAINABLE_TYPE_SLUGS as readonly string[]).includes(slug);
}

/** 可以用 AI 優化的型別（依 slug） */
export const OPTIMIZABLE_TYPE_SLUG = "prompts";

/** 優化 prompt 時 drawer 上的 item；與解說相同，送目前的值 */
export interface OptimizePromptInput {
  title: string;
  content: string;
}
