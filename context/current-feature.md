# Current Feature: Favorites 頁面

## Status

In Progress

## Goals

- Topbar 加星號圖示按鈕（Lucide `Star`，ghost icon 按鈕，`aria-label="Favorites"`），連到 `/favorites`
- 新增 `/favorites`（`src/app/(app)/favorites/page.tsx`），受保護：`src/proxy.ts` matcher 加 `/favorites/:path*`，頁面再以 `getCurrentUserId()` 擋一次，未登入導向 `SIGN_IN_PATH?callbackUrl=/favorites`
- 取出目前使用者所有收藏的 items 與 collections（排除已軟刪除），不分頁
- 兩個區塊：Items（N）與 Collections（N），各自依 `updatedAt` 由新到舊排序
- 精簡列表（VS Code／終端機風格，不用卡片）：每列為型別圖示、標題、型別 badge、日期；等寬字型、低 padding、高密度、細微 hover、只用細分隔線
- 點 item 開啟既有的 ItemDrawer（`useItemDrawer().openItem`）；點 collection 導向 `/collections/[id]`
- 沒有任何收藏時顯示空狀態；只有其中一種沒有時，該區塊顯示簡短的空訊息
- 單元測試：新增的資料庫查詢函式（`src/lib/db/`，mock prisma）

## Notes

- 來源：`context/features/favorites-spec.md`（未進版控，隨本次 commit 加入）
- 實作預設（待使用者確認，未回覆則照此實作）：
  - **排序與日期**：schema 沒有 `favoritedAt`，依 spec 用 `updatedAt` 近似「最近收藏」。限制：任何編輯都會更新 `updatedAt`，所以實際是「最近更動」。列上顯示的日期也用 `updatedAt`，讓顯示的日期和排序一致（spec 寫「date added」，若要改顯示 `createdAt` 請告知）。先前以 SQL 直接標收藏的 9 個 demo items 沒有更新 `updatedAt`，目前順序等於最後編輯時間
  - **Collection 列**：圖示用該 collection 最多的型別（沿用 `types` 彙總，與卡片底色同一個來源），沒有 item 時用 Folder 圖示；badge 顯示 `collection`，另以淡色顯示 item 數
  - **Item 列**：圖示與 badge 用 item 的型別（名稱、顏色）
  - **查詢**：新增 `src/lib/db/favorites.ts`（`listFavoriteItems`、`listFavoriteCollections`），只 select 列表需要的欄位，不載入卡片用的標籤與複製判斷；`collections.ts` 的 `summarizeTypes` 改為 export 供主要型別使用。側邊欄用的 `getFavoriteCollections`（依 createdAt）不動
  - 不分頁：Free 方案上限 50 items／3 collections，收藏數量有限
  - 字型：`font-mono`。專案只載入 Geist（sans），沒有 Geist Mono，所以實際是 Tailwind 預設的系統等寬字型（ui-monospace／Consolas 等）；不為此另載字型
- 範圍外：item 與 collection 的收藏切換按鈕目前都是停用狀態（`NOT_YET_AVAILABLE`／`FAVORITE_COMING_SOON`），本功能只做列表，不實作切換；`/collections` 不在 proxy matcher 的待辦仍另開 fix
- **無 migration**
- 驗證（2026-10-17）：`npx eslint src` 無錯誤、`npm test` 33 檔／322 項（新增 5 項）、`npm run build` 通過（`/favorites` 為 ƒ 動態）。未登入 `curl /favorites` 回 307 到 `/sign-in?callbackUrl=%2Ffavorites`。瀏覽器以 demo 帳號：Topbar 星號導向 `/favorites`；Items 9、Collections 2，依 updatedAt 由新到舊，型別色圖示與 badge、日期正確；點 item 在原頁開啟 drawer，點 collection 導向 `/collections/[id]`；390px 寬時標題截斷、collection 的 item 數隱藏，無水平捲動；console 與 dev server log 無錯誤。整頁空狀態未以真實資料實測（demo 帳號有收藏），邏輯為兩者皆為 0 時顯示

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
