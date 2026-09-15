# Current Feature

<!-- Feature Name -->

Dashboard Collections 接上資料庫

完整規格：@context/features/dashboard-collections-spec.md

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

## Goals

<!-- Goals & requirements -->

- 主區的 Collections 區塊改用 Neon + Prisma 的真實資料，取代 `src/lib/mock-data.ts`；外觀維持現狀（參考 `context/screenshots/dashboard-ui-main.png`）
- 新增 `src/lib/db/collections.ts` 放資料查詢函式，在 server component（`src/app/dashboard/page.tsx`）直接呼叫
- 顯示最近的 collections（最多 6 張卡片），依 `createdAt` 由新到舊
- **卡片左邊框色** = 該 collection 中數量最多的型別色
- **卡片底部小圖示** = 該 collection 內出現的所有型別
- 卡片上的 item 數量改為真實數字
- **統計卡四格**（Items、Collections、Favorite Items、Favorite Collections）全部改由資料庫 `count()` 取得（經使用者確認，見 Notes）
- **不做**：collection 底下的 items 列表（spec 明確延後）、Pinned／Recent Items 區塊、側邊欄

分支：`feature/dashboard-collections`

## Notes

<!-- Any extra notes -->

### 資料權限：尚無登入，暫以 demo 使用者代替

Auth.js（建置順序第 3 步）還沒做，沒有 `session.user.id`。但 §4.3 要求每個 Item／Collection 查詢都帶 `userId`，而且要從 repository 函式層強制。做法：

- `src/lib/db/collections.ts` 的每個函式都**必填 `userId` 參數**，函式內一律 `where: { userId, deletedAt: null }`
- 頁面暫時以 email 查出 `demo@devstash.io` 的 id 再傳入；這段集中在一個函式，接上 Auth 後只換這一處
- 找不到 demo 使用者時（例如 production 刻意沒有 demo 資料）顯示空狀態，不拋錯

### 實作方向

- **型別**：新增 `src/types/collections.ts` 定義卡片用的資料形狀（含 item 數量、主要型別、型別清單）；`CollectionCard` 改吃這個型別，不再依賴 mock 的 `Collection` 與 `getItemType`
- **主要型別的計算不能有 N+1**（§3.4）：一次查出 6 個 collection 與其 items 的 `itemType`（Prisma 以一個關聯一次查詢的方式載入，不是每張卡片各查一次），在 JS 端彙總各型別數量。同數量時以型別名稱排序，確保結果穩定
- 排除軟刪除：collection 與 item 的 `deletedAt` 皆須為 null
- 空的 collection：沒有主要型別，左邊框退回預設邊框色、不顯示圖示
- **動態渲染**：頁面若沒有使用任何動態 API，Next.js 會在 build 時預先渲染，資料就凍結在 build 當下，而且 build 需要連得到資料庫。需明確設為動態渲染
- 型別圖示顏色維持 inline style（色碼由資料決定，Phase 2 已記錄的例外）
- 已確認 seed 寫入的 5 個 collection 的 `createdAt` 各不相同（Prisma 在用戶端產生時間戳），依 `createdAt` 排序結果穩定

### 決定：統計卡四格都查資料庫（經使用者確認）

spec 只寫「更新 collection 統計」。若只換 collection 相關兩格，Items／Favorite Items 仍是 mock 的 10 筆，同一排數字來源不一致。四格都是單純的 `count()`（同樣帶 `userId`、排除 `deletedAt`），故一併改掉。

### 已知不一致

**側邊欄**仍讀 mock 資料，會出現主區是 demo 的 5 個 collections、側邊欄卻是 mock 的 6 個；依 spec 本次不處理。Pinned／Recent Items 區塊同樣仍是 mock。

### 實作結果

- 新增 `src/lib/db/collections.ts`（`getRecentCollections`、`getCollectionCounts`）、`src/lib/db/items.ts`（`getItemCounts`）、`src/lib/current-user.ts`（`getCurrentUserId`，暫以 demo 使用者代替 session）、`src/types/collections.ts`、`src/types/dashboard.ts`
- `CollectionCard` 改吃 `CollectionSummary`：邊框色取 `types[0]`，底部圖示依數量排序；description 為空時不渲染該段；數量為 1 時顯示 `item`
- `StatsCards` 改為接收 `stats` prop，不再 import mock
- 頁面在 `getDashboardData()` 開頭呼叫 `await connection()`（Next 16 取代 `unstable_noStore` 的做法），build 輸出確認 `/dashboard` 為 `ƒ (Dynamic)`
- `getRecentCollections` 的 items 關聯同時限制 `item.userId` 與 `item.deletedAt`：join table 本身不帶擁有者

### 驗證結果（Development，瀏覽器實測）

- 統計卡：18 Items／5 Collections／0 Favorite Items／0 Favorite Collections（seed 未設 favorite，數字正確）
- 卡片依 `createdAt` 由新到舊：Design Resources → Terminal Commands → DevOps → AI Workflows → React Patterns
- 邊框色與主要型別一致：DevOps（links 2、commands 1、snippets 1）為綠色 `#10b981`，圖示順序 Links → Commands → Snippets（同數量依名稱）；其餘單一型別的 collection 各為該型別色
- 手機寬度 390px：Collections 網格為單欄、無水平捲動
- `tsc --noEmit`、lint、build 皆通過
- 瀏覽器主控台與 Next dev overlay 的「1 Issue」皆為既有的 `pg` SSL mode 警告（伺服器端轉發），非本次改動造成

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
- **待辦**：production 分支仍是空的（無表、無資料），需依序執行 `prisma migrate deploy` 與 `prisma db seed`（**不設** `SEED_DEMO`），並在該次呼叫覆寫 `DATABASE_URL_UNPOOLED`，勿改動 `prisma.config.ts`。另外 dashboard 仍直接 import `src/lib/mock-data.ts`，尚未接上資料庫
