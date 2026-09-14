# Current Feature

<!-- Feature Name -->

Prisma + Neon PostgreSQL 初始 schema

完整規格：@context/features/database-spec.md

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

- 以 `project-overview.md` §3 的資料模型建立初始 Prisma schema
- 含 Auth.js v5 模型（Account / Session / VerificationToken）
- 適當的索引與 cascade 刪除規則
- 一律產生 migration，不用 `db push`

分支：`feature/database-schema`

## Notes

<!-- Any extra notes -->

### 版本決策：Prisma 7.10.0（不是 8）

spec 原本寫「IMPORTANT! Use Prisma 8」，但查證後 **Prisma 8 尚未 GA**（spec 隨後已更正為 Prisma 7，連結也換成 v7 升級指南）：

| 套件                    | `latest` tag  | 說明                     |
| ----------------------- | ------------- | ------------------------ |
| `prisma` (CLI)          | `8.0.0-rc.15` | release candidate        |
| `@prisma/client`        | `7.10.0`      | 沒有 8.x 穩定版          |
| `@prisma/adapter-pg`    | `7.10.0`      | 沒有 8.x 穩定版          |
| `@prisma/orm-toolchain` | `8.0.0-rc.11` | v8 CLI 的相依，同樣是 RC |

只有 CLI 把 RC 掛上 `latest`；應用程式實際 import 的 client 與 adapter 都還在 7.10.0。
Prisma 官方文件已切換為 v8（`contract.prisma`、`// use prisma-8` 指示詞、拿掉 `datasource`/`generator` 區塊、原生型別直接當欄位型別），但那是文件先行、套件未跟上。

**決定：用 7.10.0 穩定版**（經使用者確認）。官方有 v7→v8 漸進式共存升級指南，日後升級是受支援的路徑，不必現在把地基押在 RC 上。

> 附帶更正：`project-overview.md` §7 原寫「Prisma 8 已經發布」—— 這句不成立，已改為「尚未 GA、文件先行」並附上 npm 實況表。

### Neon 分支決策

spec 寫「development 分支放在 `DATABASE_URL`，production 另開」，但前一輪的 `neon link` 指向 production。
已重新 link 到既有的 `Development` 分支（`br-broad-pine-b312blp9`），`.env.local` 的 `DATABASE_URL` / `NEON_BRANCH` 已更新。production（`br-calm-boat-b3wjd64b`）只會被 `prisma migrate deploy` 碰到。

### 實作決策

- **搜尋只做階段一（pg_trgm）**：migration 裡建了 `pg_trgm` extension 與三個 GIN trgm 索引（`Item.title`、`Item.content`、`Tag.name`）。ER 圖上的 `searchVector` tsvector 欄位**刻意未建** —— §5 寫明那是階段二，等項目數破萬或需要相關性排序再上。
- **`Item.description` 有建**：ER 圖沒列，但 §5 的 tsvector 範例引用了 `coalesce(description, '')`，視為規格的一部分。
- **partial unique index 手寫在 migration**：`ItemType_slug_system_key`（`WHERE "userId" IS NULL`）。已實測三種情況 —— 重複的系統 slug 被擋、使用者自訂型別可沿用系統 slug、同一使用者不可重複自己的 slug（後者由 `@@unique([userId, slug])` 擋）。
- **onDelete 規則**：`User` → 全部 Cascade；`Item.itemTypeId` → **Restrict**（刪型別不該讓既有項目變孤兒）；`Collection.defaultTypeId` 與 `AiUsage.itemId` → SetNull（用量記錄須保留供計費稽核）。
- **`PendingDeletion.purgedAt`** 而非 `deletedAt`，避免與軟刪除語意混淆。
- **`prisma.config.ts` 手動載入 `.env.local`**：Prisma CLI 只讀 `.env`，Neon 把連線字串寫進 `.env.local`。migration 走 `DATABASE_URL_UNPOOLED` 直連（pooler 不保留 session 狀態，schema engine 需要 advisory lock）；執行期的 `src/lib/prisma.ts` 走 pooled 的 `DATABASE_URL`。
- **generated client 產到 `src/generated/prisma`**（Prisma 7 起不放 `node_modules`），已加入 `.gitignore`。
- **`npx prisma migrate dev` 在本機會「跑完卻不結束」**：migration 實際已套用成功（`_prisma_migrations` 有記錄、表與索引都在），但行程掛住不退出。驗證請改用 `npx prisma migrate status`，不要重跑 `migrate dev`。
- **seed script 已完成並跑在 Development**：`prisma/seed.ts` 寫入 7 種系統 ItemType（`isSystem = true`、`userId = null`），色碼與圖示對齊 §8 的視覺對照表；Files 與 Images 依 §6 設 `isProOnly = true`，其餘 5 種為 false。mock 的 `itemCount` 未寫入 —— 真實數字來自 `count()`。
- **seed 用 findFirst + create/update，不是 `upsert`**：系統型別的 `userId` 為 null，而 Prisma 的 `@@unique([userId, slug])` 複合唯一輸入不接受 null，無法作為 upsert 的 where。擋重複的仍是 migration 裡的 partial unique index。已實測連跑兩次：第一次 created 7、第二次 updated 7，無重複列。
- **seed 以 `tsx` 執行**（`prisma.config.ts` 的 `migrations.seed`）：改用 `node prisma/seed.ts` 會因 Node 的 ESM 解析要求副檔名而失敗，而加上 `.ts` 需要為整個專案開 `allowImportingTsExtensions`，不划算。故加 `tsx` 為 devDependency。
- **npm audit 有 4 個 high**（`deepmerge-ts`、`mysql2`），全部來自 `prisma` CLI 這個 devDependency 的傳遞相依，不進執行期 bundle，且 `mysql2` 我們根本用不到（走 Postgres）。`npm audit fix --force` 會降版到 prisma 6.19.3，更糟，故不處理。

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
- **Prisma + Neon 初始 schema 完成**（`f9d2f61`）：13 個 model（Auth 4 / Core 6 / Ops 3）與 5 個 enum，依 `project-overview.md` §3 的資料模型與 §3.3 的修正（`storageKey`、`kind` 掛 ItemType、`Tag.userId`、`pinnedAt` 時間戳、軟刪除）。migration 以 `--create-only` 產生後手寫補上 Prisma 無法表達的部分：`ItemType` 的 partial unique index（`WHERE "userId" IS NULL`）與 `pg_trgm` extension 及三個 GIN 索引。**採 Prisma 7.10.0 穩定版**（8.x 當時僅有 RC 且 client/adapter 無穩定版），並據此更正 `project-overview.md` §7 的版本說明。`prisma.config.ts` 手動載入 `.env.local` 且 migration 走 unpooled 直連；`src/lib/prisma.ts` 為執行期 singleton，走 pooled 連線。全程未使用 `db push`
- 系統型別 seed（`8851455`）：`prisma/seed.ts` 寫入 7 種系統 ItemType，色碼與圖示對齊 §8，Files／Images 依 §6 設 `isProOnly = true`。因系統型別的 `userId` 為 null 而 Prisma 複合唯一輸入不接受 null，改用 `findFirst` + `create`/`update` 而非 `upsert`；連跑兩次驗證冪等。seed 以 `tsx` 執行（新增 devDependency）
- 資料庫檢查腳本（`ad035fb`）：`scripts/test-db.ts` 唯讀檢查連線／migration／pg_trgm／系統型別／資料列數，`npm run test:db`，失敗回傳非零 exit code。已對 Development（5/5）與 production（1/5）實測
- **待辦**：production 分支仍是空的（無表、無資料），需依序執行 `prisma migrate deploy` 與 `prisma db seed`，並在該次呼叫覆寫 `DATABASE_URL_UNPOOLED`，勿改動 `prisma.config.ts`。另外 dashboard 仍直接 import `src/lib/mock-data.ts`，尚未接上資料庫
