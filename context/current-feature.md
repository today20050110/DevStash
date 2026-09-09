# Current Feature

<!-- Feature Name -->

Dashboard UI — Phase 2（側邊欄）

三階段中的第二階段。完整規格：@context/features/dashboard-phase-2-spec.md

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

- 可收合的側邊欄，取代 phase 1 的 `<h2>Sidebar</h2>` 佔位
- 型別清單，連結到 `/items/[type]`（例如 `/items/snippets`），附項目數
- Favorite collections 區塊
- 最近的 collections 區塊
- 底部使用者區（頭像、姓名、email）
- 開關側邊欄的 drawer 圖示
- 手機版一律為 drawer

資料直接 import `src/lib/mock-data.ts`，不接資料庫。

分支：`feature/dashboard-phase-2`

## Notes

<!-- Any extra notes -->

- 採用 shadcn 的 `sidebar` 元件，收合、手機 Sheet drawer、`SidebarProvider` + `SidebarTrigger` 的跨元件狀態都由它處理。`Topbar` 的假切換鈕已換成真的 `SidebarTrigger`。
- **`src/hooks/use-mobile.ts` 已改寫**：shadcn 原版在 `useEffect` 內 `setState`，觸發 `react-hooks/set-state-in-effect` 使 `npm run lint` 失敗。改用 `useSyncExternalStore`，對外 API 不變。**日後執行 `shadcn add` 可能覆蓋此檔**，覆蓋後 lint 會再次失敗。
- **最近的 collections 排除 favorites**。原本列出全部 6 個，導致 React Patterns 等三個集合在側邊欄出現兩次；參考截圖的 ALL COLLECTIONS 同樣排除 favorites。排序用 `Collection.createdAt` 由新到舊。
- **型別圖示顏色使用 inline style**（`style={{ color: type.color }}`）。色碼是資料驅動的，無法用靜態 Tailwind class 表達，除非另外維護 slug → class 對照表並讓事實來源一分為二。這是對 coding-standards「No inline styles」的一個有意識的例外。
- `itemTypes[].icon` 存的是 lucide 圖示名稱字串，由 `src/lib/icons.ts` 的對照表轉成元件，查無對應時 fallback 到 `File`。
- **`/items/[type]` 與 `/collections/[slug]` 路由尚未建立**，側邊欄連結點下去會 404。已決定接受，留待後續階段處理。
- 已在 Playwright 實測：桌面（1440）、收合、手機（390）drawer 三種狀態皆正常，console 無錯誤。`use-mobile` 改寫後有重新驗證 drawer。

## History

<!-- Keep this updated. Earliest to latest -->

- Next.js 初始設定（`a0b4100`）：以 `create-next-app` 建立專案 — Next.js 16.3.3 / React 19.2.8 / TypeScript strict / App Router / Turbopack，啟用 `src/` 目錄、ESLint 9 flat config、`@/*` → `./src/*` 路徑別名，樣式為 Tailwind CSS v4（`@tailwindcss/postcss`）
- Project setup and boilerplate cleanup（`f515e46`）：首頁清成單一 `<h1>devstash</h1>`；移除 `globals.css` 的 `@import "tailwindcss"` 與 `@theme inline`（**Tailwind 目前為停用狀態**）；移除 Geist `next/font` 設定；刪除 `public/` 下的樣板 SVG
- Dashboard UI 參考截圖（`95de780`）：加入 `context/screenshots/` 下的 main 與 drawer 兩張截圖，並修正 `project-overview.md` 中的引用路徑以對上實際檔名
- Dashboard 假資料（`d3f1a02`）：新增 `src/lib/mock-data.ts` 作為資料庫接上前的單一事實來源 — `currentUser`、`itemTypes`（7 種）、`collections`（6 個）、`items`（10 筆）。結構對齊規劃中的 Prisma model（`kind` 在 ItemType 上、`pinnedAt` 用時間戳、日期為 ISO 字串），純資料無 helper 函式
- Dashboard 三階段 spec（`f723160`）：新增 `context/features/` 下的 phase 1/2/3 規格；`Collection` 補上 `createdAt` 供「最近的 collections」排序
- shadcn/ui 初始化（`5c56691`）：radix base + nova preset（Lucide 圖示 / Geist 字型），恢復 `@import "tailwindcss"` 並寫入主題 token，安裝 `button`、`input`。未產生 `tailwind.config.*`
- **Dashboard UI Phase 1 完成**（`5aa828c`）：新增 `/dashboard` 路由 — 側邊欄 + 頂部列 + 主區的 layout，`Topbar` 元件（側邊欄切換 icon、搜尋框含 ⌘K 標記、New Collection、New Item，全為純顯示的 server component），側邊欄與主區以 `h2` 佔位，深色為預設。build 與 lint 通過
- 側邊欄相關 shadcn 元件（`d688c93`）：新增 sidebar、sheet、tooltip、separator、skeleton、avatar；`use-mobile` 改用 `useSyncExternalStore` 以通過 lint；`.gitignore` 加入 `/.playwright-mcp`
- **Dashboard UI Phase 2 完成**（`004c04a`）：`AppSidebar` — 型別清單（連向 `/items/[slug]`，含色彩圖示與數量）、favorite collections、最近的 collections（排除 favorites）、底部使用者區；可收合且手機自動切為 drawer；新增 `src/lib/icons.ts` 做圖示名稱對照。桌面／收合／手機三種狀態皆已實測，build 與 lint 通過
