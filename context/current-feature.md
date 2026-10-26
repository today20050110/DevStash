# UI 版面改善

## Status

In Progress

## Goals

### 高優先

- 側邊欄標示目前所在的頁面：用 `usePathname()` 判斷，加上 `aria-current="page"` 與醒目底色（含 `/items/[type]`、`/collections/[id]`；桌面與手機 drawer 都要）
- 註冊頁（`src/app/(auth)/register/page.tsx`）加上和登入頁一樣的 GitHub 按鈕與「or」分隔線
- 收藏集詳細頁在手機上的標頭：標題不再和 Favorite／Edit／Delete 按鈕重疊（`flex-col sm:flex-row`，按鈕移到第二行或收進選單），項目數與描述佔滿寬度

### 中優先

- 側邊欄對 Pro 使用者隱藏 Files、Images 旁的 PRO 標籤
- 主要捲動容器加 `scrollbar-gutter: stable`，換頁時標頭按鈕（New Item）不再左右移動
- 統一內容寬度（Profile、Settings、Favorites 約 900px，Dashboard、Collections 佔滿）；Favorites 改用卡片風格，不用等寬字型清單
- 手機標頭：確認 New Collection 與收藏（星號）功能在手機上找得到；星號圖示補 `aria-label` 與 tooltip
- `/upgrade` 對 Pro 使用者轉到 `/settings#billing` 時顯示提示（例如「你已經是 Pro」）
- 空白狀態加上圖示、說明與行動按鈕（例如 Favorites）

### 低優先

- 小字對比提高到至少 4.5:1（側邊欄分組標題、「Ctrl K」提示、日期等）
- 卡片圖示按鈕（星號、複製、「…」）的點擊範圍放大到 32px 以上（觸控 44px），確認都有 `aria-label`
- Dashboard 的 Pinned 改用和其他頁面一致的兩欄網格
- 側邊欄 Recent Collections 與 Favorites 的分組區分清楚（目前 Recent 只顯示 1 個，同一個收藏集可能重複出現）
- Dashboard 數值為 0 的統計淡化顯示

## Notes

- 來源：2026-10-27 以 ui-reviewer + Playwright 實際瀏覽 Development（demo 帳號，深色模式，1440×900 與 390×844）。截圖在 `.playwright-mcp/`
- 側邊欄高亮與註冊頁 GitHub 按鈕是使用者提出的，已在瀏覽器與程式碼中確認（`src/components/dashboard` 沒有使用 `usePathname`）
- 註冊頁加 GitHub 時，確認同 email 帳號的連結行為與登入頁一致
- 首頁整頁截圖的大片空白不是問題：`src/components/homepage/Reveal.tsx` 是捲動進入畫面才淡入，整頁截圖不會觸發
- 尚未檢查：平板（768px）、淺色模式、鍵盤 Tab 順序、`/items/prompts`
- 使用者決定全部處理（2026-10-27）
- **不修改的項目**：
  - 內容寬度與 Favorites 樣式：使用者選擇維持現狀。兩種寬度是 UI Review Fixes 的決定（`src/lib/page-width.ts`），Favorites 的等寬清單是 favorites-spec 指定
  - 手機標頭：已由 Topbar Mobile 處理（`+` 選單含 New Collection、側邊欄有 Favorites），星號已有 `aria-label` 與 `title`
  - 小字對比：以主題 token 計算都已超過 4.5:1（深色 6.8–8.8、淺色 4.7–7.5），reviewer 是目測
  - 卡片圖示按鈕：觸控裝置已由 `pointer-coarse:hit-area` 放大到 ≥ 40px（UI Review Fixes），桌面維持 28px
  - Recent Collections：刻意排除已收藏的 collection，不會重複；demo 3 個中 2 個收藏，所以 Recent 只有 1 個
- **實作備註**：
  - 側邊欄選中與 hover 底色相同，另加左側 2px 線（`SidebarNavLink`）；`View all collections` 用 `exact`，進到單一 collection 時只標示該 collection
  - 註冊頁的 GitHub 按鈕沿用 `GitHubSignInButton`（新增 `label`），callbackUrl 用 `DEFAULT_REDIRECT`
  - `scrollbar-gutter: stable` 加在 `html`（捲動的是整個文件）
  - `/upgrade` 對 Pro 導向 `/settings?alreadyPro=1#billing`，Settings 顯示 info toast 後把網址換回 `/settings#billing`
  - 新增 `EmptyState`，用在型別頁、`/collections`、collection 詳細頁；Favorites 的區塊空訊息補上提示文字
  - Dashboard 的 Pinned／Recent Items 改用 `ITEM_GRID_CLASS`（從 `ItemGrid` export），仍用 `ItemCard`
- **驗證**（Playwright，Development，demo 帳號，未修改資料）：snippets 頁 1 個 `aria-current`、手機 drawer 標示 DevOps；Pro 無 PRO 標籤；`/items/files`（無捲動）與 `/settings`（有捲動）的 New Item 右緣都是 1408.8px；390px collection 頁標題與按鈕不重疊；`/upgrade` 導向並顯示 toast；Dashboard 兩欄網格、0 為灰色；`/items/files` 顯示空白狀態；登出後註冊頁顯示 GitHub 按鈕（未點擊 OAuth）；console 無錯誤。eslint、tsc、`npm test`（49 檔、516 項）、`npm run build` 通過

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
