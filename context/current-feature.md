# Current Feature

<!-- Feature Name -->

Dashboard UI — Phase 1（基礎骨架）

三階段中的第一階段。完整規格：@context/features/dashboard-phase-1-spec.md

## Status

<!-- Not Started|In Progress|Completed -->

In Progress

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

- **Tailwind 目前為停用狀態**（`f515e46` 移除了 `globals.css` 的 `@import "tailwindcss"`）。本階段的「全站樣式」實質包含把它裝回去。
- Tailwind v4 用 CSS 設定：**不得**產生 `tailwind.config.ts`／`.js`，主題一律寫在 `src/app/globals.css` 的 `@theme`。shadcn init 完成後要確認它沒有建出 config 檔。
- 型別色碼以 `project-overview.md`〈型別視覺對照〉為準，之後 phase 2/3 會用到。
- 截圖上除了 New Item 還有 New Collection，兩顆都放，都是純顯示。
- 本階段不接資料；phase 2、3 才會 import `src/lib/mock-data.ts`。

## History

<!-- Keep this updated. Earliest to latest -->

- Next.js 初始設定（`a0b4100`）：以 `create-next-app` 建立專案 — Next.js 16.3.3 / React 19.2.8 / TypeScript strict / App Router / Turbopack，啟用 `src/` 目錄、ESLint 9 flat config、`@/*` → `./src/*` 路徑別名，樣式為 Tailwind CSS v4（`@tailwindcss/postcss`）
- Project setup and boilerplate cleanup（`f515e46`）：首頁清成單一 `<h1>devstash</h1>`；移除 `globals.css` 的 `@import "tailwindcss"` 與 `@theme inline`（**Tailwind 目前為停用狀態**）；移除 Geist `next/font` 設定；刪除 `public/` 下的樣板 SVG
- Dashboard UI 參考截圖（`95de780`）：加入 `context/screenshots/` 下的 main 與 drawer 兩張截圖，並修正 `project-overview.md` 中的引用路徑以對上實際檔名
- Dashboard 假資料（`d3f1a02`）：新增 `src/lib/mock-data.ts` 作為資料庫接上前的單一事實來源 — `currentUser`、`itemTypes`（7 種）、`collections`（6 個）、`items`（10 筆）。結構對齊規劃中的 Prisma model（`kind` 在 ItemType 上、`pinnedAt` 用時間戳、日期為 ISO 字串），純資料無 helper 函式
