# Current Feature: Add Pro Badge to Sidebar

在側邊欄的 Files 與 Images 型別加上 PRO 標示

來源：`context/features/add-pro-badge-sidebar.md`

## Status

In Progress

## Goals

- 側邊欄 Types 區塊中，`isProOnly` 為 true 的型別（Files、Images）在名稱後方顯示 PRO badge
- 使用 shadcn/ui 的 `Badge` 元件，樣式乾淨低調（clean and subtle），文字為全大寫 `PRO`
- 右側既有的 item 數量 badge 維持原樣，不被 PRO 遮住
- 其餘 5 種型別（Snippets／Prompts／Commands／Notes／Links）外觀完全不變
- 收合成 icon 模式時 PRO 不顯示，與右側數量 badge 的行為一致
- **不做**：Pro 權限的實際擋用（本次僅視覺標示）、Free／Pro 方案判斷、主區與其他頁面的 PRO 標示

分支：`feature/add-pro-badge-sidebar`

## Notes

### 資料來源

- `ItemType.isProOnly` 已存在於 schema，seed 只對 Files／Images 設為 true（依 §6，Free 方案不含檔案與圖片上傳）。badge 因此由 `isProOnly` 驅動，**不寫死 slug**
- `src/types/items.ts` 的 `ItemTypeWithCount` 與 `src/lib/db/items.ts` 中 `getSystemItemTypes()` 的 `select` 都要補上 `isProOnly`。`SystemItemType` 是 `Omit<ItemTypeWithCount, "itemCount">`，補在後者即一併帶到前者
- 無使用者的路徑（`AppSidebar` 走 `getSystemItemTypes()` 的分支）同樣會取得 `isProOnly`，PRO 照樣顯示、數量為 0

### 版面決策（經使用者確認）

- PRO 放在型別名稱後方 inline，右側的 item 數量保留：

  ```
  ▢  Files   PRO                 0
  ▨  Images  PRO                 0
  ```

- `SidebarMenuBadge` 是 `absolute right-1`，不占版面寬度，所以名稱加 PRO 之後必須留出右邊距，否則 PRO 會被數量壓在底下
- `SidebarMenuBadge` 自帶 `group-data-[collapsible=icon]:hidden`；PRO 需要同樣在 icon 模式隱藏，否則側邊欄只剩圖示時會溢出

### 樣式

- `Badge` 的 `variant="outline"` 最接近 spec 要的「乾淨低調」；預設 `h-5`／`text-xs` 在側邊欄單列中偏大，需縮小字級與 padding
- 文字直接寫 `PRO`，不靠 CSS `uppercase` 轉換
- PRO 三個字母對螢幕閱讀器語意不足，需補無障礙說明（例如 `sr-only` 或 `title`）

### 驗證方式

- 桌面、收合（icon）、390px 手機三種側邊欄狀態
- 有使用者（demo）與無使用者兩條路徑；無使用者路徑本機無法重現（開發資料庫有 demo 使用者），沿用上一個功能的做法記錄下來
- `tsc --noEmit`、`npm run lint`、`npm run build`

### 實作結果

- `src/types/items.ts`：`ItemTypeWithCount` 補上 `isProOnly: boolean`，`SystemItemType`（`Omit<…, "itemCount">`）一併帶到
- `src/lib/db/items.ts`：`getSystemItemTypes()` 的 `select` 補 `isProOnly`；有／無使用者兩條路徑都拿得到
- `src/components/dashboard/AppSidebar.tsx`：新增 `ProBadge`（`Badge variant="outline"`、`h-4 px-1 text-[10px]`、`text-sidebar-foreground/60`），以 `type.isProOnly &&` 渲染在名稱後方；`mr-8` 讓出右側數量 badge 的位置（量測結果見下），`group-data-[collapsible=icon]:hidden` 與 `SidebarMenuBadge` 行為一致
- 視覺文字為 `aria-hidden` 的 `PRO`，另附 `sr-only` 的「Pro plan only」供螢幕閱讀器
- 型別名稱的 `<span>` 明確加上 `truncate`：badge 成為最後一個 span 後會吃掉 `SidebarMenuButton` 的 `[&>span:last-child]:truncate`，不補的話長名稱不再截斷
- 右邊距以 DOM 量測決定：PRO 右緣與數量 badge 左緣的間距，現況（短名稱 + 1 位數）為 114px；最壞情況（名稱長到把 PRO 推向右側、數量又是 3 位數）`mr-6` 為 −2px 會重疊，`mr-8` 為 +6px。現有 7 種系統型別名稱都短，觸發不到，但改為 `mr-8` 後徹底排除

### 驗證結果

- 桌面（1568px）：Files／Images 顯示 PRO，右側數量 0 未被遮住；其餘 5 種型別外觀不變
- 手機（Playwright 390px，側邊欄為 Sheet drawer）：同上，主控台 0 errors / 0 warnings
- `tsc --noEmit`、`npm run lint`、`npm run build` 皆通過，`/dashboard` 仍為 `ƒ (Dynamic)`
- 「無使用者」路徑本機無法重現（開發資料庫有 demo 使用者），沿用上一個功能的處理：`isProOnly` 由同一個 `getSystemItemTypes()` 提供，該路徑同樣會顯示 PRO

### 已知情況

- 本專案的 `Sidebar` 用預設的 `collapsible="offcanvas"`，桌面收合時整個側邊欄滑出畫面，**沒有 icon 模式**。`group-data-[collapsible=icon]:hidden` 目前不會觸發，是與 `SidebarMenuBadge` 對齊的預防性寫法；Goal 寫的「收合成 icon 模式時 PRO 不顯示」在現況下無從驗證
- 驗證時 Chrome 的網頁翻譯會在每個名稱後插入中文，那不是本專案的輸出；390px 截圖以 Playwright 取得，未受影響

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
- **側邊欄在沒有使用者時仍顯示系統型別**（`39f5b05`）：Vercel production 部署後側邊欄只剩 logo —— 尚無 Auth，`getCurrentUser()` 查不到 demo 使用者（production 依設計不寫 demo 資料），而 `AppSidebar` 把整個 `SidebarContent` 綁在使用者存在與否。`src/lib/db/items.ts` 抽出 `getSystemItemTypes()`（系統型別不含使用者資料，不需要 `userId`），`getSystemItemTypesWithCounts(userId)` 改為呼叫它再合併 `groupBy` 數量；`AppSidebar` 查無使用者時仍列出型別、數量為 0，Collections 與底部使用者區維持只在有使用者時顯示。同時對 production 執行 seed（**未設** `SEED_DEMO`）補上 7 種系統型別，`test:db` 以 production 連線為 6/6（Demo 資料 SKIP、資料列數全 0）
- **Vercel 部署**：build 指令在專案設定中被覆寫為 `prisma generate && prisma migrate deploy && next build`。兩次失敗皆為環境變數問題：先是缺 `DATABASE_URL_UNPOOLED`（`prisma.config.ts` 以 `env()` 讀取，缺值即 `PrismaConfigEnvError`），再來是連線字串格式錯誤（P1013）。production 環境變數需同時設定 pooled 的 `DATABASE_URL` 與直連的 `DATABASE_URL_UNPOOLED`，值不可加引號
- **待辦**：Preview 部署同樣會跑 `prisma migrate deploy`，若 Preview 與 Production 共用資料庫，未合併的 migration 會直接套用到正式資料庫，建議改為 Preview 連另一個 Neon 分支。`src/lib/mock-data.ts` 已無任何引用，經使用者確認暫時保留。`scripts/test-db.ts` 印出的「Neon 分支」讀 `.env.local` 的 `NEON_BRANCH`，不隨實際連線變動
