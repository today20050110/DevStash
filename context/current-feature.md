# Current Feature: File List View

## Status

In Progress

## Goals

- `/items/files` 改為單欄列表（類似 Google Drive／Dropbox），不再是卡片網格
- 每一列顯示：依副檔名決定的檔案圖示、檔名、檔案大小、上傳日期、下載按鈕
- 滑鼠移到列上時整列反白
- 點擊列開啟 ItemDrawer
- 下載按鈕直接下載檔案，且不觸發開啟 drawer（stop propagation）
- 手機寬度時資訊改為垂直堆疊

## Notes

- 來源：`context/features/file-display-spec.md`
- 現況：`src/app/(app)/items/[type]/page.tsx` 以 container query grid 渲染卡片，圖片 item 已改用 `ImageCard`（依 `ItemSummary.isImage` 逐筆判斷）；`ItemSummary` 只有 `isImage`，沒有檔名、大小、MIME，列表需要補上檔案摘要（不可送出 `storageKey`）
- 版面（列表 vs 網格）是整頁層級的決定，不能逐筆判斷；可沿用 `src/lib/file-types.ts` 既有的 `getUploadCategory(typeSlug) === "file"`，與上傳規則用同一份對照
- 允許的副檔名只有 pdf、txt、md、json、yaml／yml、xml、csv、toml、ini（`UPLOAD_RULES.file`），圖示對照可以只涵蓋這些，其他退回一般 `File` 圖示；對照函式放在 `src/lib/` 以便單元測試
- 下載：`GET /api/items/[id]/file` 已回 `Content-Disposition: attachment`（含 RFC 5987 檔名），下載按鈕用 `<a href>` 即可，不需要 JS fetch；會計入 `downloadFile` 速率限制（120 次／分鐘）
- 點擊列沿用 `ItemCardTrigger` 的覆蓋按鈕做法；下載連結必須疊在覆蓋按鈕之上（DOM 順序或 z-index，參考 ImageCard 的教訓），否則點不到，同時不能是巢狀互動元素（button 內不能放 a）
- 現有工具：`formatFileSize`、`formatDate`（`src/lib/format.ts`）
- 使用者決定（皆採建議）：標題為主、原始檔名為次（兩者相同時只顯示一次）；桌面版加欄位標題列（Name／Size／Uploaded），手機堆疊時隱藏
- 實作：`ItemSummary.isImage` 改為 `file: ItemFile | null`（檔名、大小、MIME；`findItemSummaries` 沿用 `toItemFile`，不送出 `storageKey`），圖片卡片改在頁面以 `isImageMimeType(item.file.mimeType)` 判斷；新增 `src/lib/file-icons.ts`（`getFileExtension`、`getFileIcon`：pdf／txt／md → FileText、json → FileBraces、xml → FileCode、csv → FileSpreadsheet、yaml／yml／toml／ini → FileCog，其他 → File）；新增 `src/components/items/FileList.tsx`（外框 + `divide-y` 的列表；頁面寬 ≥ `@2xl` 時為四欄 grid 並顯示 Name／Size／Uploaded 標題列，較窄時大小與日期疊在名稱下方；列 hover `bg-muted/50`；`ItemCardTrigger` 覆蓋整列；下載為 `<a href="/api/items/[id]/file" download>`，`relative z-10` 疊在覆蓋按鈕之上，兩者是兄弟元素而非巢狀，點下載不會觸發開啟 drawer，所以不需要 `stopPropagation`）；`/items/[type]` 以 `getUploadCategory(slug) === "file"` 決定整頁用列表
- 驗證（Development，demo 帳號，上傳 pdf、csv、json、yml 與中文長檔名 md 共 5 個測試檔，其中 pdf 的標題改為「Q3 Quarterly Report」）：1440 為表格式排列、各副檔名圖示正確、標題與檔名不同時顯示兩行、hover 反白；點下載按鈕下載 `sales-data.csv`（內容正確）且 drawer 未開啟；點列開啟對應的 drawer；390 時標題列隱藏、大小與日期疊在名稱下方、長檔名截斷、無水平捲動；Images 頁三張縮圖仍正常；主控台 0 errors。新增 `src/lib/file-icons.test.ts`（4 個），`getItemsByType` 測試改為驗證 `file`，`npm test` 194/194、tsc、lint、build 通過
- 資料：Development 的 demo 帳號新增 5 個測試檔案 item 與其 R2 物件，經使用者確認保留供之後測試

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
