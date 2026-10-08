// monaco-editor 沒有替 edcore.main（不含語言服務的核心入口）附型別；
// 它匯出的 API 與 editor.api 相同
declare module "monaco-editor/esm/vs/editor/edcore.main" {
  export * from "monaco-editor/esm/vs/editor/editor.api";
}
