# Current Feature

Dashboard Items 接上資料庫

完整規格：@context/features/dashboard-items-spec.md

## Status

已完成

## Goals

- 主區的 **Pinned** 與 **Recent Items** 區塊改用 Neon + Prisma 的真實資料，取代 `src/lib/mock-data.ts`；外觀維持現狀（參考 `context/screenshots/dashboard-ui-main.png`）
- 在既有的 `src/lib/db/items.ts` 新增 item 查詢函式，在 server component（`src/app/dashboard/page.tsx`）直接呼叫
- **ItemCard 的圖示與左邊框色** 由該 item 的型別（`itemType`）決定
- 卡片保留現有內容：標題、pin／星號、description、tag badge、日期
- **沒有 pinned items 時整個 Pinned 區塊不顯示**（含標題）
- 統計卡：spec 要求「更新 collection 統計」，上一個功能已將四格全部改查資料庫，本次確認數字與 items 查詢一致即可
- **不做**：側邊欄（仍讀 mock）、item drawer、`/items/[type]` 路由

分支：`feature/dashboard-items`

## Notes

### 資料權限

沿用上一個功能的做法：`src/lib/db/items.ts` 的函式**必填 `userId`**，一律 `where: { userId, deletedAt: null }`；頁面以 `getCurrentUserId()` 取得 demo 使用者 id，找不到時兩個區塊皆為空。

### 實作方向

- **型別**：新增 `src/types/items.ts` 定義卡片用的資料形狀（含型別的 icon／color、tag 名稱陣列）；`ItemCard` 改吃這個型別，不再依賴 mock 的 `Item` 與 `getItemType`
- **Pinned**：`pinnedAt` 不為 null，依 `pinnedAt` 由新到舊
- **Recent Items**：依 `createdAt` 由新到舊，取 10 筆；pinned 與 recent 是不同維度，同一筆可同時出現在兩區（維持現行行為）
- **避免 N+1**：`itemType` 與 tags 以 `include`／`select` 隨 item 一次載入，不在卡片層各自查詢
- **Tags**：經由 `ItemTag` join table 取得；tag 本身帶 `userId`，查詢時一併限制 `tag.userId`，避免 join table 不帶擁有者造成跨使用者資料混入
- 日期序列化：Prisma 回傳 `Date`，傳給元件前確認與 `formatDate`（en-US + UTC）的輸入型別相符
- 型別圖示顏色維持 inline style（色碼由資料決定，Phase 2 已記錄的例外）
- 頁面已呼叫 `await connection()`，維持動態渲染

### 決定：調整 seed 補上 pinned 與 tags（經使用者確認）

demo 資料原本沒有任何 `pinnedAt` 與 tag，Pinned 區塊與 tag badge 兩條路徑無法在瀏覽器驗證。選擇改 seed 而非手動改資料，讓 demo 資料固定涵蓋這兩種情況：

- `DemoItem` 新增 `tags`（必填）與 `pinned`；18 筆 items 皆有 tag，3 筆釘選（useDebounce & useLocalStorage、Code review、Deploy to Vercel with migrations），`pinnedAt` 依出現順序遞減，排序穩定
- 重建時一併刪除 demo 使用者的 tags；tags 先以 `createManyAndReturn` 建立，item 再以 `tagId` 連結（seed 的 item 用 unchecked input，無法巢狀 `connectOrCreate`）

### 已知情況

- 側邊欄仍讀 mock 資料，依 spec 本次不處理
- 刪除 `src/lib/item-types.ts`：`ItemCard` 改吃 `ItemSummary` 後不再有任何引用（經使用者確認）

### 實作結果

- `src/lib/db/items.ts` 新增 `getPinnedItems`、`getRecentItems`，共用私有的 `findItemSummaries`：`userId`／`deletedAt` 放在呼叫端條件之後無法覆寫，tags 關聯另限制 `tag.userId` 並依名稱排序
- 排序加上 `id` 作為同值時的次要鍵：seed 以巢狀 create 建立的同一 collection 內 items 的 `createdAt` 完全相同，不加的話列表順序不穩定（瀏覽器實測時發現）
- 新增 `src/types/items.ts`（`ItemSummary`、`ItemTypeSummary`）；`ItemCard` 改吃 `ItemSummary`，description 為空時不渲染
- `formatDate` 參數由 ISO 字串改為 `Date`（唯一呼叫端是 `ItemCard`）
- 頁面五個查詢以 `Promise.all` 平行執行；Pinned 為空時整個 section 不渲染，Recent Items 為空時顯示 `No items yet.`

### 驗證結果（Development，瀏覽器實測）

- seed 連跑兩次結果相同（collections 5／items 18／tags 26／pinned 3），`npm run test:db` 全數 PASS，tag 總數 26 無重複
- Pinned：3 張，依釘選順序 useDebounce & useLocalStorage → Code review → Deploy to Vercel with migrations，皆有 pin 圖示，邊框色分別為 snippets 藍、prompts 紫、commands 橘
- Recent Items：10 張，依 `createdAt` 由新到舊，重新整理後順序不變；已釘選的 Deploy to Vercel 同時出現在兩區
- Tag badge 依名稱排序顯示；統計卡維持 18 Items／5 Collections／0／0
- 桌面與 390px 手機寬度皆無水平捲動；瀏覽器主控台無錯誤或警告
- `tsc --noEmit`、lint、build 皆通過，`/dashboard` 為 `ƒ (Dynamic)`

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
- **待辦**：production 分支仍是空的（無表、無資料），需依序執行 `prisma migrate deploy` 與 `prisma db seed`（**不設** `SEED_DEMO`），並在該次呼叫覆寫 `DATABASE_URL_UNPOOLED`，勿改動 `prisma.config.ts`。Dashboard 側邊欄仍直接 import `src/lib/mock-data.ts`，與主區的真實資料不一致
