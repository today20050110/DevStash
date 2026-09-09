# Current Feature

<!-- Feature Name -->

Dashboard UI — Phase 1（基礎骨架）

三階段中的第一階段。完整規格：@context/features/dashboard-phase-1-spec.md

## Status

<!-- Not Started|In Progress|Completed -->

Completed

## Goals

<!-- Goals & requirements -->

- shadcn/ui 初始化，安裝本階段需要的元件
- 新增 `/dashboard` 路由
- 主要 dashboard layout 與全站樣式
- 深色模式為預設
- 頂部列：搜尋框 + New Item 按鈕（純顯示，無功能）
- 側邊欄與主區先用 `<h2>Sidebar</h2>`、`<h2>Main</h2>` 佔位

分支：`feature/dashboard-phase-1`

## Notes

<!-- Any extra notes -->

- **Tailwind 已重新啟用**（`5c56691`）。`f515e46` 曾移除 `globals.css` 的 `@import "tailwindcss"`，本階段裝回，主題 token 由 shadcn 寫入。
- 已確認**沒有**產生 `tailwind.config.ts`／`.js`，`components.json` 的 `tailwind.config` 為空字串，主題全在 `globals.css` 的 `@theme inline` — 符合 Tailwind v4 的 CSS 設定規範。
- shadcn 把 `shadcn` 與 `cn` 裝成 runtime dependency（`globals.css` 會 `@import "shadcn/tailwind.css"`，`src/lib/utils.ts` 僅 `export { cn } from "cn"`）。這是新版 CLI 的正常行為，未更動。
- 深色模式是在 `<html>` 寫死 `dark` class。spec 與截圖都沒有切換器，故不引入 `next-themes`；日後要做切換器時再換掉。
- **手機版斷點未實測**：桌面寬度已在瀏覽器確認，但 `resize_window` 無效（截圖尺寸不變），`hidden md:block` 的實際表現尚未親眼驗證。手機版側邊欄為 phase 2 的 drawer 工作。
- 型別色碼以 `project-overview.md`〈型別視覺對照〉為準，phase 2/3 會用到。
- 本階段不接資料；phase 2、3 才會 import `src/lib/mock-data.ts`。

## History

<!-- Keep this updated. Earliest to latest -->

- Next.js 初始設定（`a0b4100`）：以 `create-next-app` 建立專案 — Next.js 16.3.3 / React 19.2.8 / TypeScript strict / App Router / Turbopack，啟用 `src/` 目錄、ESLint 9 flat config、`@/*` → `./src/*` 路徑別名，樣式為 Tailwind CSS v4（`@tailwindcss/postcss`）
- Project setup and boilerplate cleanup（`f515e46`）：首頁清成單一 `<h1>devstash</h1>`；移除 `globals.css` 的 `@import "tailwindcss"` 與 `@theme inline`（**Tailwind 目前為停用狀態**）；移除 Geist `next/font` 設定；刪除 `public/` 下的樣板 SVG
- Dashboard UI 參考截圖（`95de780`）：加入 `context/screenshots/` 下的 main 與 drawer 兩張截圖，並修正 `project-overview.md` 中的引用路徑以對上實際檔名
- Dashboard 假資料（`d3f1a02`）：新增 `src/lib/mock-data.ts` 作為資料庫接上前的單一事實來源 — `currentUser`、`itemTypes`（7 種）、`collections`（6 個）、`items`（10 筆）。結構對齊規劃中的 Prisma model（`kind` 在 ItemType 上、`pinnedAt` 用時間戳、日期為 ISO 字串），純資料無 helper 函式
- Dashboard 三階段 spec（`f723160`）：新增 `context/features/` 下的 phase 1/2/3 規格；`Collection` 補上 `createdAt` 供「最近的 collections」排序
- shadcn/ui 初始化（`5c56691`）：radix base + nova preset（Lucide 圖示 / Geist 字型），恢復 `@import "tailwindcss"` 並寫入主題 token，安裝 `button`、`input`。未產生 `tailwind.config.*`
- **Dashboard UI Phase 1 完成**（`5aa828c`）：新增 `/dashboard` 路由 — 側邊欄 + 頂部列 + 主區的 layout，`Topbar` 元件（側邊欄切換 icon、搜尋框含 ⌘K 標記、New Collection、New Item，全為純顯示的 server component），側邊欄與主區以 `h2` 佔位，深色為預設。build 與 lint 通過
