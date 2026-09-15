# Current Feature

Stats 與側邊欄接上資料庫

完整規格：@context/features/stats-sidebar-spec.md

## Status

已完成

## Goals

- 主區統計卡顯示資料庫資料，外觀與版面維持現狀
- 側邊欄 **Types** 改讀資料庫的系統型別，含圖示、型別色與 item 數量，連向 `/items/[slug]`
- 側邊欄 **Favorites** 與 **Recent Collections** 改讀資料庫的 collections
- Favorites 保留星號圖示；Recent Collections 每個 collection 顯示彩色圓點，顏色為該 collection 中數量最多的型別
- Collections 清單下方新增 **View all collections** 連結，指向 `/collections`
- item 相關查詢函式放在 `src/lib/db/items.ts`，寫法參考 `src/lib/db/collections.ts`
- **不做**：`/items/[type]` 與 `/collections` 路由本身（連結目前仍會 404）、item drawer

分支：`feature/stats-sidebar`

## Notes

### 與 spec 前提的差異

- **統計卡已接資料庫**：Dashboard Collections 功能已將四格改查資料庫（`getItemCounts`、`getCollectionCounts`），本次只確認數字與側邊欄一致，不重做
- **`src/lib/db/items.ts` 已存在**：spec 寫「建立」，實際是在既有檔案新增函式

### 資料權限

沿用既有做法：db 函式必填 `userId`、一律排除 `deletedAt`；經 join table 的關聯另限制 `item.userId`。側邊欄以 `getCurrentUserId()` 取得 demo 使用者，找不到時各區塊為空。

系統型別本身不屬於任何使用者（`userId` 為 null），但型別旁的 **item 數量只能計算該使用者的 items**。

### 實作方向

- **AppSidebar 取資料**：目前是 layout 內的同步元件、直接 import mock。改為 async server component 查詢資料庫；完成後確認 build 輸出 `/dashboard` 仍為 `ƒ (Dynamic)`，必要時在側邊欄也呼叫 `connection()`
- **型別數量**：以一次 `groupBy`（依 `itemTypeId`）計算，再與系統型別清單合併，不逐型別各查一次；數量為 0 的型別仍顯示
- **型別排序**：`ItemType` 沒有排序欄位，以固定的 slug 順序常數排序（對齊 `project-overview.md` §8 表格），確保穩定
- **Collections**：Favorites 列出全部收藏；Recent Collections 排除收藏、依 `createdAt` 由新到舊（`id` 為次要鍵）
- **圓點顏色**：沿用 `collections.ts` 的 `summarizeTypes` 規則（數量最多、同數量依名稱排序），與主區 `CollectionCard` 邊框色一致；空 collection 使用中性色
- 型別色與圓點色維持 inline style（資料驅動，Phase 2 已記錄的例外）
- layout 與 page 各自查詢 collections，屬於不同區塊的兩次查詢，不是 N+1

### 決定（經使用者確認）

- Recent Collections 最多 **10 筆**，其餘由 View all collections 連結進入
- 圓點與 `Folder` 圖示**並列**，數量 badge **保留**
- 底部使用者區**一併改讀** demo 使用者（名稱、email、縮寫），側邊欄不再 import `src/lib/mock-data.ts`

### 決定：seed 補上收藏的 collections（經使用者確認）

demo 資料原本沒有任何收藏的 collection，Favorites 區塊與星號路徑無法在瀏覽器驗證。比照上一個功能補 pinned 的做法改 seed：

- `DemoCollection` 新增選填的 `isFavorite`；React Patterns 與 AI Workflows 設為收藏（最早建立的兩個），Recent Collections 仍剩 3 筆，兩個區塊皆有資料
- seed 輸出補上 favorites 數量；`scripts/test-db.ts` 未檢查 `isFavorite`，不需調整
- `src/lib/mock-data.ts` 已無任何引用，經使用者確認先保留

### 實作結果

- `src/lib/db/items.ts` 新增 `getSystemItemTypesWithCounts`：系統型別（`isSystem` 且 `userId` 為 null）與一次 `groupBy` 的數量合併，依 `SYSTEM_TYPE_ORDER` 排序
- `src/lib/db/collections.ts` 抽出私有的 `findCollectionSummaries`（沿用 items 的寫法，`userId`／`deletedAt` 無法被覆寫），新增 `getFavoriteCollections`、`getRecentNonFavoriteCollections`（上限 10）；排序補上 `id` 次要鍵，主區 Collections 同樣受益
- `src/lib/current-user.ts` 新增 `getCurrentUser()`（id、name、email），以 React `cache()` 包起來，layout 與頁面同一請求只查一次；`getCurrentUserId()` 改為呼叫它，介面不變
- 新增 `src/types/user.ts`（`CurrentUser`）；`src/types/items.ts` 新增 `ItemTypeWithCount`
- `AppSidebar` 改為 async server component，呼叫 `connection()` 後以 `Promise.all` 平行查詢；拆成 `ItemTypeMenuItem`、`FavoriteCollectionMenuItem`、`RecentCollectionMenuItem`、`UserMenu`；圖示改用 `TypeIcon`。找不到使用者時只顯示 logo；沒有收藏時 Favorites 區塊不渲染

### 驗證結果（Development，瀏覽器實測）

- Types：7 種依 §8 順序，數量 Snippets 4／Prompts 3／Commands 5／Notes 0／Files 0／Images 0／Links 6，加總 18 與統計卡一致；圖示色與型別色相符，連結為 `/items/[slug]`
- Recent Collections：5 筆，每筆 Folder 圖示 + 圓點 + 數量 badge；圓點色與主區 `CollectionCard` 左邊框色逐一相符（Design Resources 綠、Terminal Commands 橘、DevOps 綠、AI Workflows 紫、React Patterns 藍）；下方為 View all collections → `/collections`
- 底部使用者區顯示 Demo User／demo@devstash.io，縮寫 DU
- Favorites：尚無收藏時區塊正確不渲染；seed 補上收藏後顯示 AI Workflows、React Patterns 兩筆，皆帶星號，Recent Collections 剩 Design Resources／Terminal Commands／DevOps 三筆；統計卡 Favorite Collections 為 2，主區兩張卡片同樣帶星號
- seed（`SEED_DEMO=1`）連跑兩次結果相同（collections 5，其中 favorites 2／items 18／tags 26／pinned 3），`npm run test:db` 6/6 PASS
- 桌面與 390px 手機寬度（drawer）皆無水平捲動；瀏覽器主控台無錯誤或警告
- `tsc --noEmit`、lint、build 皆通過，`/dashboard` 仍為 `ƒ (Dynamic)`

## History

<!-- Keep this updated. Earliest to latest -->

- Next.js 初始設定（`a0b4100`）：以 `create-next-app` 建立專案 — Next.js 16.3.3 / React 19.2.8 / TypeScript strict / App Router / Turbopack，啟用 `src/` 目錄、ESLint 9 flat config、`@/*` → `./src/*` 路徑別名，樣式為 Tailwind CSS v4（`@tailwindcss/postcss`）
- Project setup and boilerplate cleanup（`f515e46`）：首頁清成單一 `<h1>devstash</h1>`；移除 `globals.css` 的 `@import "tailwindcss"` 與 `@theme inline`（**Tailwind 目前為停用狀態**）；移除 Geist `next/font` 設定；刪除 `public/` 下的樣板 SVG
- Dashboard UI 參考截圖（`95de780`）：加入 `context/screenshots/` 下的 main 與 drawer 兩張截圖，並修正 `project-overview.md` 中的引用路徑以對上實際檔名
- Dashboard 假資料（`d3f1a02`）：新增 `src/lib/mock-data.ts` 作為資料庫接上前的單一事實來源 — `currentUser`、`itemTypes`（7 種）、`collections`（6 個）、`items`（10 筆）。結構對齊規劃中的 Prisma model（`kind` 在 ItemType 上、`pinnedAt` 用時間戳、日期為 ISO 字串），純資料無 helper 函式
- Dashboard 三階段 spec（`f723160`）：新增 `context/features/` 下的 phase 1/2/3 規格；`Collection` 補上 `createdAt` 供「最近的 collections」排序
- shadcn/ui 初始化（`5c56691`）：radix base + nova preset（Lucide 圖示 / Geist 字型），恢復 `@import "tailwindcss"` 並寫入主題 token，安裝 `button`、`input`。未產生 `tailwind.config.*`，主題全在 `globals.css` 的 `@theme inline`
- **Dashboard UI Phase 1 完成**（`5aa828c`）：新增 `/dashboard` 路由 — 側邊欄 + 頂部列 + 主區的 layout，`Topbar` 元件（側邊欄切換 icon、搜尋框含 ⌘K 標記、New Collection、New Item，全為純顯示的 server component），側邊欄與主區以 `h2` 佔位，深色為預設（`<html>` 寫死 `dark` class，未引入 `next-themes`）。build 與 lint 通過
- 側邊欄相關 shadcn 元件（`d688c93`）：新增 sidebar、sheet、tooltip、separator、skeleton、avatar；`use-mobile` 改用 `useSyncExternalStore` 以通過 lint；`.gitignore` 加入 `/.playwright-mcp`
- **Dashboard UI Phase 2 完成**（`004c04a`）：`AppSidebar` — 型別清單（連向 `/items/[slug]`，含色彩圖示與數量）、favorite collections、最近的 collections（排除 favorites 避免重複列出）、底部使用者區；可收合且手機自動切為 drawer；新增 `src/lib/icons.ts` 做圖示名稱對照。桌面／收合／手機三種狀態皆已實測，build 與 lint 通過。三個待處理事項：（1）`src/hooks/use-mobile.ts` 已改寫，日後執行 `shadcn add` 可能覆蓋而使 lint 再次失敗；（2）型別圖示顏色使用 inline style，是對 coding-standards「No inline styles」的有意識例外，因色碼為資料驅動；（3）`/items/[type]` 與 `/collections/[slug]` 路由尚未建立，側邊欄連結目前會 404
- 主區用的 shadcn 元件（`455e317`）：新增 `card`、`badge`
- **Dashboard UI Phase 3 完成**（`906561f`）：主區內容 —— `StatsCards`（4 張統計卡，數字由陣列推導）、`CollectionCard`（左邊框為主要型別色）、`ItemCard`（型別圖示方塊、pin/星號、tag badge、日期）；頁面組成為統計卡 → Collections 網格 → Pinned → 10 筆 Recent Items。新增 `src/lib/format.ts`（固定 en-US + UTC 避免 hydration 不一致）、`src/lib/item-types.ts`、`TypeIcon` 元件（以 `createElement` 規避 `react-hooks/static-components`）。桌面與手機皆已實測，build 與 lint 通過。**Dashboard UI 三階段至此全部完成**
- Neon 專案設定（`c975143`）：`neon skills` / `neon mcp` / `neon link` / `neon config init`，`neon.ts` 設為空 policy；`neon deploy` 對 production 為 no-op。`.neon` 與 `.env.local` 均已 gitignore。**注意**：`neon mcp -y` 會鑄造帳號層級 API key 並寫進 8 個家目錄設定檔（id `3337195`，以 `neon api-keys revoke 3337195` 撤銷）
- **Prisma + Neon 初始 schema 完成**（`f9d2f61`）：13 個 model（Auth 4 / Core 6 / Ops 3）與 5 個 enum，依 `project-overview.md` §3 的資料模型與 §3.3 的修正（`storageKey`、`kind` 掛 ItemType、`Tag.userId`、`pinnedAt` 時間戳、軟刪除）。migration 以 `--create-only` 產生後手寫補上 Prisma 無法表達的部分：`ItemType` 的 partial unique index（`WHERE "userId" IS NULL`）與 `pg_trgm` extension 及三個 GIN 索引。**採 Prisma 7.10.0 穩定版**（8.x 當時僅有 RC 且 client/adapter 無穩定版），並據此更正 `project-overview.md` §7 的版本說明。`prisma.config.ts` 手動載入 `.env.local` 且 migration 走 unpooled 直連；`src/lib/prisma.ts` 為執行期 singleton，走 pooled 連線。全程未使用 `db push`。已知問題：`npx prisma migrate dev` 在本機套用成功後行程不退出，驗證改用 `prisma migrate status`；npm audit 的 4 個 high 皆來自 prisma CLI 的傳遞相依，不進執行期 bundle，`audit fix --force` 會降版故不處理
- 系統型別 seed（`8851455`）：`prisma/seed.ts` 寫入 7 種系統 ItemType，色碼與圖示對齊 §8，Files／Images 依 §6 設 `isProOnly = true`。因系統型別的 `userId` 為 null 而 Prisma 複合唯一輸入不接受 null，改用 `findFirst` + `create`/`update` 而非 `upsert`；連跑兩次驗證冪等。seed 以 `tsx` 執行（新增 devDependency）
- 資料庫檢查腳本（`ad035fb`）：`scripts/test-db.ts` 唯讀檢查連線／migration／pg_trgm／系統型別／資料列數，`npm run test:db`，失敗回傳非零 exit code。已對 Development（5/5）與 production（1/5）實測
- **Seed 範例資料完成**（`771398b`）：依 `context/features/seed-spec.md` 重寫 `prisma/seed.ts` —— demo 使用者 `demo@devstash.io`（bcryptjs 12 rounds、`plan = FREE`）、5 個 collections、18 筆 items，link 使用真實文件網址。spec 的 `isPro` 對應為 `plan`；系統型別維持複數命名以對齊 dashboard 路由與 mock 資料。**demo 資料只在 `SEED_DEMO=1` 時寫入**，避免 production 出現公開密碼的帳號（經使用者確認）。冪等做法：以 email upsert 使用者，再於同一 transaction 內刪除該使用者的 items／collections 後重建（demo 帳號內手動新增的內容會被清掉）。新增 `bcryptjs` 3.0.3 為 dependency。Development 上連跑兩次無重複；build、lint、tsc 通過
- test-db 加入 demo 資料檢查（`c3455cf`）：第 6 項「Demo 資料」以單次 `findUnique` + include 驗證帳號（plan、emailVerified、密碼雜湊）、5 個 collection 的型別組成、TEXT/URL 欄位一致性與孤兒 item，通過後列出全部 collection 與 item；找不到 demo 使用者時為 SKIP 而非 FAIL。預期組成以常數 `EXPECTED_DEMO_COLLECTIONS` 與 seed 對照（seed 模組載入即執行，無法 import）。實測 PASS／SKIP／FAIL 三條路徑皆正確
- **Dashboard Collections 接上資料庫完成**（`96e9d30`）：依 `context/features/dashboard-collections-spec.md`，主區 Collections 區塊與四張統計卡改讀 Neon。新增 `src/lib/db/collections.ts`（`getRecentCollections`、`getCollectionCounts`）、`src/lib/db/items.ts`（`getItemCounts`），函式皆必填 `userId` 並排除 `deletedAt`；items 關聯另限制 `item.userId`，因 join table 不帶擁有者。尚無 Auth，以 `src/lib/current-user.ts` 的 `getCurrentUserId()` 暫查 demo 使用者，找不到時顯示空狀態。`CollectionCard` 邊框色取數量最多的型別（同數量依名稱排序），底部列出全部型別圖示。統計卡四格皆改查資料庫（spec 只寫 collection 統計，經使用者確認擴及 items 兩格）。頁面呼叫 `await connection()` 避免 build 時預先渲染，`/dashboard` 為動態路由。瀏覽器實測桌面與 390px 手機寬度，build、lint、tsc 通過
- 首頁導向 dashboard（`eaf4401`）：尚無 landing page，`src/app/page.tsx` 改為 `redirect("/dashboard")`，避免首頁只有一行 `devstash` 字樣而看似全黑。curl 驗證 307 → `/dashboard` 200
- **Dashboard Items 接上資料庫完成**（`f8a6618`）：依 `context/features/dashboard-items-spec.md`，主區 Pinned 與 Recent Items 改讀 Neon。`src/lib/db/items.ts` 新增 `getPinnedItems`、`getRecentItems`，共用的查詢函式必填 `userId`、排除 `deletedAt`，tags 關聯另限制 `tag.userId`；排序以 `id` 為次要鍵，因 seed 巢狀建立的同一 collection 內 items `createdAt` 相同。新增 `src/types/items.ts`，`ItemCard` 改吃 `ItemSummary`（型別決定圖示與邊框色），`formatDate` 改收 `Date`。沒有 pinned items 時整個 Pinned 區塊不渲染。seed 為 18 筆 demo items 補上 tags（26 個）與 3 筆 pinned，重建時一併清除 demo 使用者的 tags（經使用者確認改 seed 而非手動改資料）。刪除不再使用的 `src/lib/item-types.ts`。seed 連跑兩次冪等、`test:db` 全數 PASS；瀏覽器實測桌面與 390px 手機寬度，build、lint、tsc 通過
- **Stats 與側邊欄接上資料庫完成**（`b4ef0a0`）：依 `context/features/stats-sidebar-spec.md`，側邊欄改讀 Neon。`src/lib/db/items.ts` 新增 `getSystemItemTypesWithCounts`（系統型別 + 一次 `groupBy` 的數量，只計目前使用者的 items，依 §8 順序排序）；`src/lib/db/collections.ts` 抽出共用的 `findCollectionSummaries`，新增 `getFavoriteCollections`、`getRecentNonFavoriteCollections`（上限 10），排序補上 `id` 次要鍵。`AppSidebar` 改為 async server component 並呼叫 `connection()`：Favorites 保留星號，Recent Collections 以圓點標示主要型別色（與 `CollectionCard` 邊框色一致）並保留數量 badge，新增 View all collections 連結；底部使用者區改讀 demo 使用者，`getCurrentUser()` 以 React `cache()` 讓 layout 與頁面同一請求只查一次。統計卡已於先前接上資料庫，本次確認型別數量加總與之一致。seed 將 React Patterns、AI Workflows 設為收藏以實測 Favorites（經使用者確認）。seed 連跑兩次冪等、`test:db` 6/6 PASS；瀏覽器實測桌面與 390px 手機寬度，build、lint、tsc 通過
- **待辦**：production 分支仍是空的（無表、無資料），需依序執行 `prisma migrate deploy` 與 `prisma db seed`（**不設** `SEED_DEMO`），並在該次呼叫覆寫 `DATABASE_URL_UNPOOLED`，勿改動 `prisma.config.ts`。`src/lib/mock-data.ts` 已無任何引用，經使用者確認暫時保留
