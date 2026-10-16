# Current Feature: Favorites 頁面排序

## Status

In Progress

## Goals

- `/favorites` 頁首（標題列右側）加排序選單：Date、Name、Type，預設 Date（維持目前的順序）
- 排序在用戶端進行，不重新查詢資料庫、不換頁；一個選單同時套用到 Items 與 Collections 兩個區塊
- 排序規則：
  - **Date**：`updatedAt` 由新到舊（與目前伺服器的順序相同）
  - **Name**：標題／名稱 A→Z，不分大小寫、數字依數值比較（`item 2` 在 `item 10` 之前）
  - **Type**：依型別名稱 A→Z，同型別再依名稱；collection 用主要型別，沒有 item（型別為 null）的排最後
- 排序邏輯放在純函式（`src/lib/favorites-sort.ts`）並加單元測試
- 點 item 開 drawer、點 collection 換頁、空狀態等既有行為不變

## Notes

- 來源：inline 描述（「Add client-side sorting to the favorites page. We should be able to sort by name, date and item type」）
- 實作預設（待使用者確認，未回覆則照此實作）：
  - **控制項**：沿用已安裝的 shadcn `Select`（與設定頁一致），標示「Sort by」；不加升降冪切換（描述沒有要求，各排序固定一個方向）
  - **不保存選擇**：重新整理或再次進入頁面時回到 Date；不寫進網址參數或 localStorage
  - **元件**：頁面維持 server component 查資料，排序選單與兩個區塊包進新的 client component（`src/components/favorites/FavoritesList.tsx`）；`FavoriteItemRow`、`FavoriteCollectionRow`、`FavoritesSection` 沿用
  - **比較方式**：`Intl.Collator`（`sensitivity: "base"`、`numeric: true`），固定 `en` locale，避免伺服器與瀏覽器 locale 不同造成差異；`Array.prototype.sort` 為穩定排序，同值時保留原本（Date）的順序
  - 只有一筆或沒有收藏時，選單仍顯示（整頁空狀態時不顯示）
- **無 migration**，不改資料查詢
- 實作補充：頁面把標題（`heading`）當 prop 傳給 `FavoritesList`，讓排序選單與標題同列（窄螢幕時換行到標題下方）；整頁空狀態仍由頁面直接渲染，不顯示選單。副標題從「…, most recently updated first」改為「Your starred items and collections」（可改排序後原句不再正確）
- 驗證（2026-10-17）：`npx eslint src` 無錯誤、`npm test` 34 檔／347 項（新增 7 項）、`npm run build` 通過。瀏覽器以 demo 帳號：預設 Date 與原順序相同（React Patterns 因稍早重新收藏排第一）；Name 為 A→Z 不分大小寫；Type 依 commands → files → images → links → prompts → snippets，collections 依主要型別（AI Workflows 為 prompts、React Patterns 為 snippets）；排序後點 item 仍開 drawer；重新整理回到 Date；390px 寬時選單換行到標題下方；console 與 dev server log 無錯誤

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
