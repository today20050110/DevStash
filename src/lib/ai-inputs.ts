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
