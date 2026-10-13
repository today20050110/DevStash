# Current Feature: Collection 編輯、刪除與收藏按鈕

## Status

In Progress

## Goals

- `/collections/[id]` 頁首有三個按鈕：Edit、Delete、Favorite
- **Edit**：開啟 modal 編輯 metadata（name、description），欄位與驗證沿用新增 collection 的 dialog 與 `createCollectionSchema` 的規則；成功與失敗都以 toast 提示，存檔後 `router.refresh()` 讓頁首、卡片、側邊欄、item 表單的 collection 選項同步
- **Delete**：確認對話框（沿用 `DeleteItemDialog` 的 AlertDialog 樣式），說明 item 不會被刪除；刪除後 toast，在詳細頁時導回 `/collections`
- 刪除 collection **不刪除任何 item**：item 只是不再出現在該 collection 中（drawer 的 Collections、item 表單的選項都看不到它），item 本身、標籤與其他 collection 的歸屬不受影響
- **Favorite**：只放圖示與按鈕，依 `isFavorite` 顯示實心或空心星號，這次不實作切換
- `/collections` 與 dashboard 的 `CollectionCard` 右上角有「⋯」按鈕，下拉選單含 Edit、Delete、Favorite，行為同上；點卡片其他任何地方仍進入該 collection 頁，點「⋯」與選單不會觸發卡片的導覽
- 以使用者為範圍：更新與刪除都以 `userId` + `deletedAt: null` 確認擁有者，不屬於使用者、不存在或已刪除的一律回「Collection not found」
- Server actions（`src/actions/collections.ts` 的 `updateCollection`、`deleteCollection`）回傳 `{ success, data, error, fieldErrors }`，資料庫邏輯放在 `src/lib/db/collections.ts`
- 單元測試：action 流程（驗證、未登入、找不到、錯誤對應）與 lib/db 的寫入條件

## Notes

- 來源：inline 描述（`/feature load`）
- **刪除方式**：Collection 有 `deletedAt`，與 item 的刪除一致採軟刪除。`ItemCollection` 連結保留但不再顯示——所有讀取查詢（卡片的 item 數、drawer、表單選項、`setItemCollections`）都已排除已刪除的 collection，使用者看起來就是「item 不在那個 collection 了」，誤刪時也能從資料庫還原。另一個做法是同時刪掉 `ItemCollection` 連結（無法還原歸屬），預設不這樣做
- 軟刪除後 slug 仍被佔用（`@@unique([userId, slug])` 不排除已刪除的），新增時的去重已包含已刪除的列，不會衝突；collection 數上限只算未刪除的，刪除後即可再新增
- **改名時 slug 不變**：網址用 id，slug 目前沒有被任何地方使用，保留原值避免改名後又要處理衝突
- **Favorite 按鈕**：不實作的期間預設停用（`disabled`，提示「Coming soon」），避免點了沒反應；下拉選單中的項目同樣停用
- Edit modal 與 New Collection 共用表單欄位與送出流程，抽出共用元件，不複製一份
- 卡片的整張連結是 `after:absolute after:inset-0` 的覆蓋層，「⋯」按鈕要疊在覆蓋層之上（`relative z-10`）才點得到
- 預期**無 migration**
- 不做：收藏切換、從 collection 頁移除單一 item、還原已刪除的 collection、側邊欄的 collection 選單
- **決定**：使用者未對三項預設表示意見，照預設實作（軟刪除保留連結、Favorite 停用、改名不改 slug）
- 實作：schema 與型別改為通用名稱 `collectionSchema`／`CollectionData`／`CollectionInput`／`CollectionField`，action 回應 `CollectionResult`（新增與編輯共用）。`db/collections.ts` 新增 `updateCollection`、`softDeleteCollection`（皆以 `updateMany` + `{ id, userId, deletedAt: null }`，依 count 判斷）。`actions/collections.ts` 新增 `updateCollection`、`deleteCollection`（id 驗證 → Zod → 登入 → 寫入，找不到回「Collection not found」）。UI：`CollectionFormDialog`（新增與編輯共用的受控 dialog，`NewCollectionDialog` 改為按鈕 + 它）、`EditCollectionDialog`（以 name／description 為 key，refresh 後重新掛載，下次開啟不會是舊值）、`DeleteCollectionDialog`（受控 AlertDialog）、`CollectionActions`（詳細頁頁首；刪除後 `router.replace("/collections")` + `router.refresh()`，因為側邊欄在 layout 裡換頁不會重新取得）、`CollectionCardMenu`（`DropdownMenu modal={false}` 避免從選單開 dialog 後 body 的 pointer-events 卡住；觸發按鈕 `relative z-10` 疊在卡片連結覆蓋層上）。停用的 Favorite 在頁首以外層 `title` 提示、在選單項目標「Soon」（停用項目收不到滑鼠事件）
- 驗證（Development，測試帳號）：卡片「⋯」開啟選單不會導覽；選單 Edit 改名與描述 → 卡片與側邊欄更新，再次開啟帶出新值；選單 Delete 確認 → 卡片消失、總數與側邊欄更新；點卡片連結進詳細頁，頁首 Favorite 停用、Edit 更新描述；頁首 Delete 一個含 item 的 collection → 導回 `/collections` 顯示空狀態、側邊欄更新，該 item 仍在 `/items/snippets`、drawer 不再顯示 Collections，SQL 確認 item 未刪除、連結保留且 collection 已軟刪除；console 無錯誤。`npm test` 270 通過、`npm run build` 通過
- 已知：測試帳號的兩個 collection 都在驗證中刪除了（軟刪除）

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
