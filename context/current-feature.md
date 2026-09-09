# Current Feature

<!-- Feature Name -->

Dashboard UI — Phase 3（主區內容）

三階段中的最後一階段。完整規格：@context/features/dashboard-phase-3-spec.md

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

- 右側主區內容，取代 phase 1 的 `<h2>Main</h2>` 佔位
- 頂部 4 張統計卡：項目數、集合數、favorite 項目數、favorite 集合數（截圖上沒有）
- Recent collections 卡片網格
- Pinned items
- 10 筆 recent items

資料直接 import `src/lib/mock-data.ts`，不接資料庫。

分支：`feature/dashboard-phase-3`

## Notes

<!-- Any extra notes -->

- **統計卡的數字由陣列推導**（10 / 6 / 3 / 3），不讀顯示用的 `itemCount` 欄位，因為真實實作就是 `count()`。代價是側邊欄顯示 Snippets 24、統計卡卻說總共 10 筆 —— 這是 mock 資料先天的矛盾（`itemTypes[].itemCount` 加總 85 是為了對上截圖而寫死的），不是 bug，接上資料庫後自然消失。
- **pinned items 沒有從 recent items 排除**：兩者是不同的軸，同一筆同時出現是正常的。這與 phase 2 側邊欄「最近的集合排除 favorites」不一致，但那裡是兩個相鄰的同類清單，重複會像 bug。
- 集合卡片的強調色取 `collection.typeIds[0]` 的型別色，畫在**左側邊框**（`project-overview.md` 寫的是卡片背景色，以截圖為準）。沿用 phase 2 的 inline style 例外。
- 日期以 `en-US` + UTC 固定格式化（`src/lib/format.ts`），避免 `toLocaleDateString()` 在 server 與 client 算出不同結果造成 hydration 不一致。
- **新增 `TypeIcon` 元件**：`const Icon = getIcon(name)` 這種寫法會觸發 `react-hooks/static-components`（lint 直接失敗），改用 `createElement` 包裝。注意 `AppSidebar` 仍是舊寫法 —— 它在 `map` callback 內，該規則不會觸發，未一併改動。
- `/items/[type]` 與 `/collections/[slug]` 仍未建立，卡片與 View all 連結會 404。沿用 phase 2 的決定，接受。
- 已在 Playwright 實測桌面（1440 全頁）與手機（390），版面正確、無水平溢出、console 無錯誤。

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
