# Current Feature: Pinned Items

## Status

Complete

## Goals

- 新增 `toggleItemPin` server action（Zod 驗證、`{ success, data, error }` 回傳格式、只能改自己的 item）
- ItemDrawer 的 Pin 按鈕可以點（目前只顯示狀態，`aria-disabled`、沒有 onClick）
- 樂觀更新：點下去立刻切換 Pin／Pinned，失敗時還原
- 成功與失敗都顯示 toast
- 已釘選的 items 在列表中排在最前面
- Dashboard 的 Pinned 區塊反映最新的釘選狀態
- 沿用 Favorite Button 的寫法（`use-favorite-toggle`、`FavoriteButton`、`setItemFavorite`）
- 只做 items，不做 collections
- ItemCard 上的 Pin 圖示維持靜態標示，不能點

## Notes

- 來源：`context/features/pinned-spec.md`
- 資料欄位是 `pinnedAt: DateTime?`，不是布林值（見 project-overview 3.3）：釘選時寫入 `now()`，取消時設為 `null`；dashboard 的 `getPinnedItems` 已依 `pinnedAt desc` 排序
- 參考實作：`src/hooks/use-favorite-toggle.ts`、`src/components/favorites/FavoriteButton.tsx`、`src/actions/items.ts` 的 `setItemFavorite`、`src/lib/db/item-mutations.ts`（用 `updateMany` 加上 userId／deletedAt 條件，依 count 判斷是否存在）
- 要接上的地方：`src/components/items/ItemDrawerActions.tsx`（拿掉 aria-disabled 和「尚未接上功能」的註解），ItemDrawer 要像 `onFavoriteChange` 一樣把新狀態回寫給 drawer
- 排序：型別頁與 collection 頁的 `getItemsPage` 目前只依 `createdAt desc`，要改成先依 `pinnedAt` 再依 `createdAt`。Postgres 的 DESC 預設把 NULL 排在最前面，所以要寫 `{ pinnedAt: { sort: "desc", nulls: "last" } }`，否則未釘選的會跑到上面
- 決定：dashboard 的 Recent items 維持只依 createdAt 排序，不把釘選的排前面（已有獨立的 Pinned 區塊）
- `@updatedAt` 在 updateMany 時也會更新，所以釘選會改變 /favorites 的「最近」順序，與收藏切換的行為一致
- 測試：server action（驗證、找不到、錯誤處理）與 `src/lib/db` 的 mutation 及排序條件
- 實作：`setItemPinned`（db，回傳寫入的 pinnedAt）、`toggleItemPin`（action，傳入目標值而非翻轉，與 setItemFavorite 一致）、`PinResult`、`useItemPinToggle`、`PinButton`；`ItemSummaryQuery.orderBy` 改成陣列以支援多個排序條件
- 驗證：`npm test` 357 項通過、`npm run build` 通過；瀏覽器（Development，demo 帳號）：Commands 頁開 drawer 釘選「npm: dependencies」→ 按鈕立即變 Pinned、toast「Pinned」、關閉 drawer 後該卡片移到第一個（原已釘選的 Deploy to Vercel 排第二）；dashboard Pinned 區塊出現且排第一；從 dashboard drawer 取消釘選 → toast「Unpinned」，Pinned 區塊回到原本 3 筆（資料已還原，但該 item 的 updatedAt 已更新）
