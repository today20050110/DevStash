# Current Feature: Item 加入 Collections

## Status

In Progress

## Goals

- 新增 item 的 dialog（`NewItemDialog`）與 drawer 的編輯模式（`ItemEditForm`）都有一個 Collections 輸入，可從使用者現有的 collections 中選零個、一個或多個
- 新增時選的 collections 與 item 在同一個 transaction 內寫入 `ItemCollection`
- 編輯時以選取結果整批替換該 item 的 collections：新選的加入、取消的移除，原本就在的保留（不動 `addedAt`、`position`）
- 只能加入自己的、未刪除的 collection：`collectionIds` 在伺服器端以 `userId` + `deletedAt: null` 篩過，不屬於該使用者或不存在的 id 回欄位錯誤，不寫入
- 可選的 collections 由 server component 以 lib/db 函式（只取 `id`、`name`，依名稱排序）載入，在 `(app)/layout.tsx` 查一次後傳給 `Topbar` → `NewItemDialog` 與 `ItemDrawerProvider` → `ItemEditForm`
- 存檔後畫面反映新的歸屬：drawer 的 Collections 區塊、dashboard collection 卡片的 item 數與型別組成、側邊欄 collection 數量（`router.refresh()`）
- 使用者還沒有任何 collection 時，輸入區顯示提示而不是空清單
- Zod：`collectionIds` 為字串陣列，去重，設上限
- 單元測試：schema、lib/db 的寫入（新增時連結、編輯時的增減、擁有者過濾）、action 的流程（不屬於使用者的 id）

## Notes

- 來源：inline 描述（`/feature load`）
- 不做：collection 詳細頁、在 collection 端管理 item、排序（`position` 維持預設 0）
- Schema 已有 `ItemCollection`（`@@id([itemId, collectionId])`、`addedAt`、`position`），預期**無 migration**
- drawer 的 `CollectionsSection` 目前在編輯模式下「只顯示」（`ItemDrawerSections.tsx:185` 的註解寫「collections 另行管理」），這次在編輯模式改成可選的輸入，檢視模式維持顯示
- `getItemDetail` 已經以 `userId` 與 `deletedAt` 篩過 collections，編輯表單的初始選取可直接用 `item.collections`
- UI 做法：shadcn 沒有 multi-select，目前也沒有安裝 Popover／Command。預設用可勾選的清單（與新增 dialog 的型別選擇一樣用原生 checkbox，方向鍵與表單語意交給瀏覽器），collection 多時清單限高捲動。若想要下拉搜尋式的 combobox，需要另外安裝 shadcn 的 `popover` 與 `command`
- 跟 tags 一樣由 `updateItem` 整批替換；collections 的連結改以差集計算，而不是 tags 那樣先 `deleteMany` 再建立，避免把原本的 `addedAt` 洗掉
- 新增 item 的額度、collection 數上限都不受影響（加入 collection 不會產生新 collection）
- **決定**：使用者未對 UI 選擇表示意見，依預設採勾選清單（`src/components/items/CollectionSelect.tsx`，`max-h-40` 捲動，沒有 collection 時顯示提示）
- 實作：`item-schemas.ts` 的 `itemFields` 加 `collectionIds`（新增與編輯共用；trim、去重、上限 `MAX_ITEM_COLLECTIONS = 50`）；`db/collections.ts` 新增 `getCollectionOptions`、`findOwnedCollectionIds`（可傳 transaction client）；`item-mutations.ts` 的 `setItemCollections` 在 createItem／updateItem 的 transaction 內以差集同步（`deleteMany` 沒選的、`createMany({ skipDuplicates })` 新選的），寫入時再以擁有者篩一次，`deleteMany` 只碰未刪除的 collection；`actions/items.ts` 的 `ownsAllCollections` 先擋下不屬於自己的 id 回欄位錯誤（`UpdateItemErrorField` 加 `collectionIds`）。`(app)/layout.tsx` 以 `Promise.all` 與型別一起查，經 `Topbar` → `NewItemDialog`、`ItemDrawerProvider` → `ItemDrawer` → `ItemEditForm` 傳下去；drawer 編輯模式的唯讀 `CollectionsSection` 換成 `CollectionSelect`
- 驗證（Development，測試帳號 `collection-test@devstash.local`）：新增 snippet 勾兩個 collection → 兩張卡片都變 1 item 並顯示 snippet 型別色、側邊欄數量更新；drawer 編輯時預先勾好兩個，取消一個後儲存 → drawer 只剩 React Patterns、卡片變 0／1，SQL 確認被取消的連結已刪除、保留的那筆 `addedAt` 未變；console 無錯誤。`npm test` 251 通過、`npm run build` 通過（資料頁仍為動態）
- 已知：本機已有另一個 dev server（PID 16496）在跑，驗證沿用它；測試帳號底下多了一筆 item

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
