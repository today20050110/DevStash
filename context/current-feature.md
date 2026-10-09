# Current Feature: Code Scan Fixes (L2, L5)

## Status

In Progress

## Goals

- L2：取得上傳網址期間關閉 New Item dialog 或切換型別時，上傳確實中止，不再 PUT 到 R2、不再把結果寫回已重設的表單
- L5：react-markdown 與 remark-gfm 只在顯示 Markdown 預覽時才下載，不再跟著每個登入後頁面的 layout 載入

## Notes

- 來源：`docs/audit-results/CODE_SCAN_REVIEW.md` 的 L2、L5，使用者指定修正
- L2：`FileUpload` 的 `xhrRef` 改為 `abortRef`（每次上傳一個 `AbortController`，unmount 時 abort）；`requestUploadUrl` 的 fetch 帶 `signal`，`putFile` 收 `signal`——已中止時直接以 `AbortError` reject，否則 abort 時呼叫 `xhr.abort()`。原本的 `catch` 已忽略 `AbortError`，`finally` 照常呼叫 `onUploadingChange(false)`，父層不會卡在上傳中
- L5：預覽與 `MARKDOWN_COMPONENTS` 移到新的 `src/components/items/MarkdownPreview.tsx`（default export），`MarkdownEditor` 以 `next/dynamic` 載入並以兩條 Skeleton 當 loading；Write 分頁是一般 textarea，不觸發下載
- 驗證：
  - L5：`rm -rf .next` 後重新 build，含 micromark 的 chunk 約 144 KB（gzip 約 43 KB），只出現在 dashboard、`/items/[type]`、`/profile` 的 `react-loadable-manifest.json` 與負責動態 import 的 chunk，不在任何 `page_client-reference-manifest.js`；瀏覽器中 drawer 唯讀檢視正確渲染 markdown、空內容的 Preview 顯示「Nothing to preview.」。dev 模式的 chunk 切法不同，無法用來量測
  - L2（Playwright，以 `page.route` 把 `/api/uploads` 延遲 3 秒、直接對 `input[type=file]` 設檔案）：等待期間按 Esc 關閉後重開，表單為空、Create 停用、0 次 R2 PUT；等待期間切到 Files，同樣沒有寫回、0 次 PUT；不延遲時正常上傳完成並預填標題
  - `npm test` 205/205、tsc、lint、build 通過（這次只改元件，沒有新增單元測試）
- 已知情況：L2 正常上傳的那次沒有按 Create，R2 上多一個沒有 item 的物件（檔案上傳既有的已知情況：未建立 item 的上傳會留下孤兒物件）；`rm -rf .next` 時背景 dev server 仍在執行，之後確認仍正常回應

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
