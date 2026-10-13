# Current Feature: Global Search / Command Palette

## Status

In Progress

## Goals

- 以 Cmd+K（Mac）／Ctrl+K（Windows）開啟全域 command palette，在 `(app)` 底下的每一頁都能用
- 跨 items 與 collections 的模糊搜尋，結果分成 Items、Collections 兩組
- 鍵盤操作：方向鍵移動、Enter 選取、Esc 關閉
- Items 顯示型別圖示（型別色），Collections 顯示 item 數量
- 選 item → 開啟既有的 item drawer；選 collection → 前往 `/collections/[id]`
- Top bar 的搜尋框點擊（或聚焦後輸入）即開啟 palette，placeholder 旁維持 ⌘K 提示；Windows 上提示改為 Ctrl K
- 使用 shadcn 的 `command` 元件（`cmdk`）
- 搜尋在用戶端進行，輸入時不打伺服器；可搜尋的資料在進入 app 時預先取得
- 資料內容：items（id、title、型別、content 預覽）、collections（id、name、itemCount）；以使用者為範圍，排除已刪除的 item 與 collection
- 資料由 lib/db 函式取得並在 server component 傳下去，盡量沿用既有查詢
- 新增、編輯、刪除 item 或 collection 後（`router.refresh()`）palette 的資料同步更新
- 單元測試：新增的 lib/db 查詢與純函式

## Notes

- 來源：`context/features/global-search-spec.md`
- **與 project-overview §5 的差異**：overview 規劃 v1 用 `pg_trgm` 在伺服器端 `ILIKE` 搜尋（索引已建好）。spec 改為用戶端搜尋，在目前的規模（Free 50 筆）反應最快、實作簡單；項目數變大時（Pro 不限）預先載入的資料量會跟著成長，屆時再回到 overview 的伺服器端搜尋。這次照 spec 做，在 overview 補一句記錄
- **content 預覽不能直接載入完整 content**：列表查詢刻意不載入 content（上限 1 MB），Prisma 也無法 select 子字串。預設以 `$queryRaw` 的 `left(content, N)` 只取前幾百字，與其他欄位一起以 `userId` + `deletedAt` 篩選；只在用戶端搜尋 title、型別名稱與預覽，不是完整 content
- **資料在哪裡取得**：`(app)/layout.tsx` 已經為 top bar 與 drawer 查一次 collection 選項；palette 的資料同樣在 layout 以 `Promise.all` 一起查。collections 可沿用 `findCollectionSummaries`（已有 itemCount），但它會載入每個 collection 的 items 型別，對 palette 而言多餘——預設另寫一個只取 id、name 與 `_count` 的輕量查詢
- **item drawer 的位置**：`ItemDrawerProvider` 目前只包住 `<main>` 的內容，`Topbar` 在它外面，palette 拿不到 `openItem`。需要把 provider 往上移，包住 top bar 與頁面
- **cmdk 的比對**：cmdk 內建的 `command-score` 是模糊比對（字元依序出現即可），符合「fuzzy」；不另裝 fuse.js 等函式庫。比對文字以 `keywords` 帶入型別名稱與 content 預覽
- 需要安裝 shadcn 的 `command` 元件（會加入 `cmdk` 依賴）；`dialog` 已經有了
- 不做：伺服器端搜尋、搜尋 tags、最近搜尋紀錄、在 palette 裡新增 item／collection 的指令
- 預期**無 migration**
- 實作：`npx shadcn add command` 新增 `ui/command.tsx`、`ui/input-group.tsx` 與依賴 `cmdk`（`cn` 原本就有）；產生的 `CommandDialog` 把 `DialogTitle` 放在 `DialogContent` 外，已移進去。`src/lib/db/search.ts` 的 `getSearchData`：items 以 `$queryRaw` 取 `left(COALESCE(content, url, fileName), 300)`，`src/lib/search.ts` 的 `toSearchPreview` 壓成單行並截到 120 字；collections 以 `_count`（只算未刪除的 item）。`(app)/layout.tsx` 改查 `getSearchData`，item 表單的 collection 選項從它取出，**移除 `getCollectionOptions`**（少一次查詢）；`ItemDrawerProvider` 移到包住 `Topbar` 與頁面，裡面再包 `CommandPaletteProvider`。`src/components/search/CommandPalette.tsx`（Cmd/Ctrl+K 開關、`useCommandPalette`、選 item 開 drawer、選 collection 前往頁面）與 `SearchButton.tsx`（top bar 的搜尋框改為外觀相同的按鈕，依平台顯示 ⌘ K 或 Ctrl K，用 `useSyncExternalStore` 避免 hydration 不一致）
- **群組排序**：cmdk 只排序組內項目，不會依分數重排群組（明確指定群組 `value` 也一樣），搜尋「devops」時完全相符的 collection 排在只有模糊相符的 items 後面。改為由元件控制搜尋字串，以同一個 `defaultFilter` 比較兩組的最高分決定先後
- 驗證（Development，demo 帳號）：Ctrl+K 開啟並列出 items（含檔名預覽）；`usdbnc` 模糊找到 useDebounce；`devops` 時 DevOps collection 排第一並自動選取，Enter 前往該頁；點 top bar 搜尋框開啟，方向鍵移動、Enter 開啟 item drawer；collection 頁上的卡片仍能開 drawer；改 collection 名稱後 palette 立即找得到新名稱（測完已改回「DevOps」）；無結果時顯示「No results found.」。`npm test` 276 通過、`npm run build` 通過
- 已知：比對包含 content 預覽，短查詢會帶出一些只在預覽中模糊相符的 items（排在後面）；瀏覽器目前登入的是 demo 帳號

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
