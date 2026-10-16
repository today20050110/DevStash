# Current Feature: Editor Preferences 設定

## Status

In Progress

## Goals

- `User` 新增 JSON 欄位 `editorPreferences`，以 `prisma migrate dev` 建立並套用 migration（只在 Development，不用 `db push`）
- `/settings` 新增 Editor preferences 區塊：Font size 下拉、Tab size 下拉、Word wrap 開關（預設開）、Minimap 開關（預設關）、Theme 下拉（`vs-dark`／`monokai`／`github-dark`，預設 `vs-dark`）
- 自動儲存：任一欄位變更即呼叫 server action 寫入資料庫，沒有儲存按鈕；成功顯示 toast，失敗顯示錯誤 toast 並還原為先前的值
- Server action `updateEditorPreferences`（`src/actions/editor-preferences.ts`）：驗證 session、Zod 驗證輸入、只更新目前使用者，回傳 `{ success, data, error }`
- `EditorPreferencesContext`（client）：提供目前偏好與更新函式；由登入後的 layout 從資料庫讀出初始值傳入
- `CodeEditor`（Monaco）改讀 context：字級、tab size、word wrap、minimap、主題皆套用；在設定頁改動後，之後開啟的編輯器立即反映
- 單元測試：偏好的解析／預設值合併工具（`src/lib/`）與 server action 的流程

## Notes

- 來源：`context/features/editor-settings-spec.md`（未進版控，隨本次 commit 加入）
- 實作預設（待使用者確認，未回覆則照此實作）：
  - **選項值**：Font size 12／13／14／16／18／20，預設 **13**（維持目前外觀）；Tab size 2／4／8，預設 **2**
  - **主題**：`vs-dark` 對應現有的自訂 `devstash-dark`（以 vs-dark 為底、背景對齊 app 的深色 token），預設外觀不變；Monaco 沒有內建 monokai 與 github-dark，兩者以 `defineTheme` 在 `beforeMount` 自行定義（token 色彩規則 + 背景色）
  - **Word wrap 預設開**：這會改變目前的行為（現在是不換行）
  - **行高**：目前固定 `LINE_HEIGHT = 20` 並用來估算編輯器高度；改為依字級推算（約 1.5 倍），高度估算跟著用
  - **欄位型別**：`editorPreferences Json?`（可為 null）；null 或缺欄位、值不合法時，在讀取時與預設值合併（`parseEditorPreferences`），不把預設值寫進資料庫，日後改預設值不需要 migration
  - **寫入方式**：action 接收完整的偏好物件（Zod 以 enum／literal 限制合法值），整筆覆寫；下拉與開關是離散操作，不做 debounce
  - **不加速率限制**：只寫自己的一筆資料，風險低；沿用其他 action 的 session 檢查
  - **UI 元件**：需新增 shadcn `select` 與 `switch`
  - Markdown 編輯器（notes／prompts）不是 Monaco，不受影響
- 進度（2026-10-17）：migration `20261016180921_add_user_editor_preferences` 已以 `prisma migrate dev` 套用到 Development（`ep-lucky-frost-b3c82uje`），內容只有 `ALTER TABLE "User" ADD COLUMN "editorPreferences" JSONB`。偏好由 `getCurrentUser` 一併查出（不多一次查詢），`CurrentUser` 新增 `editorPreferences`。主題定義移到 `src/components/items/editor-themes.ts`。`npx eslint src` 無錯誤、`npm test` 32 檔／317 項通過、`npm run build` 通過。瀏覽器以 demo 帳號實測：預設值正確顯示；改主題出現「Editor preferences saved」toast；改 Monokai／18px／minimap 後重新整理，值仍在（已寫入資料庫）；打開 snippet 的 Monaco 背景 `#272822`、字級 18px、行高 27px、minimap 顯示、長行換行；改 GitHub Dark／13px／minimap 關後以側邊欄連結（不重新整理）回到 snippets，編輯器即套用（背景 `#0d1117`、行高 20px、無 minimap）；最後改回 VS Dark，demo 帳號回到預設值。瀏覽器 console 與 dev server log 無錯誤。儲存失敗時的還原未在瀏覽器實測
- **部署注意**：Vercel 的 build 指令會跑 `prisma migrate deploy`，合併並部署後這個 migration 會套用到 production（新增可為 null 的欄位，不影響既有資料）

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
