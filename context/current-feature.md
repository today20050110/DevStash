# Current Feature: Pagination

## Status

In Progress

## Goals

- `/items/[type]` 與 `/collections/[id]` 加上分頁，每頁 `ITEMS_PER_PAGE = 21`
- `/collections` 加上分頁，每頁 `COLLECTIONS_PER_PAGE = 21`
- 分頁控制列放在列表下方：頁碼連結與 Previous／Next；沒有上一頁或下一頁時呈灰色停用
- 頁碼放在網址的 `?page=N`，可分享、可用上一頁返回；第 1 頁不帶參數
- 只取當頁需要的資料：lib/db 的列表查詢加上 `skip`／`take`，總數另以 `count` 取得，不再一次載入全部
- 頁首的數量（「N items」「N collections」）改用總數，不是當頁筆數
- Dashboard 的上限改用具名常數：`DASHBOARD_COLLECTIONS_LIMIT = 6`、`DASHBOARD_RECENT_ITEMS_LIMIT = 10`（取代目前的 `RECENT_COLLECTIONS_LIMIT`、`RECENT_ITEMS_LIMIT`，數值不變）
- 常數集中在一個地方，頁面與 lib/db 共用
- 單元測試：頁碼解析（無效值、超出範圍）、頁碼清單（含省略號）、lib/db 查詢的 `skip`／`take` 與 `count` 條件

## Notes

- 來源：`context/features/pagination-spec.md`（指令寫的是 `pagination.spec.md`，實際檔名為 `pagination-spec.md`）
- **`/collections` 也分頁**：spec 的需求只列了 `/items/[type]` 與 `/collections/[id]`，但定義了 `COLLECTIONS_PER_PAGE`，唯一用得到它的是 `/collections`；預設一併分頁
- **頁碼無效或超出範圍**：`?page=abc`、`0`、負數視為第 1 頁；超過最後一頁時顯示最後一頁（先 `count` 再查當頁，兩次查詢有先後）。另一個做法是回 404，預設不這樣做
- **頁碼很多時**：顯示第一頁、最後一頁、目前頁的前後各一頁，中間以「…」省略（例如 `1 … 4 5 6 … 20`）；只有一頁時不顯示分頁控制列
- **元件**：shadcn 有 `pagination` 元件，可安裝後改用 Next 的 `Link`；或沿用現有 `Button` 自己組。預設安裝 shadcn 的，與其他 UI 一致
- `/items/[type]` 的檔案型別用 `FileList`、其他用 `ItemGrid`，兩者都只拿當頁資料，分頁控制列共用
- 卡片的複製按鈕判斷（`findCopyableItemIds`）本來就只查傳入的 id，分頁後只查當頁
- 側邊欄的 `SIDEBAR_RECENT_COLLECTIONS_LIMIT`、`PINNED_ITEMS_LIMIT` 不在 spec 內，維持原樣
- command palette 的資料（`getSearchData`）是刻意一次載入全部以便用戶端搜尋，不受這條「不一次取全部」影響
- 預期**無 migration**
- **決定**：使用者未對四項表示意見，照預設實作（`/collections` 也分頁、超出範圍顯示最後一頁、省略號頁碼、shadcn `pagination`）
- 實作：`src/lib/pagination.ts`（四個常數、`parsePageParam` 沿用 `firstParam`、`getPageCount`、`loadPage`（先 count、修正頁碼再取當頁，沒有資料時不查列表）、`getPageList`、`pageHref`）。`npx shadcn add pagination`；`PaginationLink` 改用 Next 的 `Link`，沒有 `href` 時呈停用（`aria-disabled`、灰色、不可點、不在 Tab 順序）。`findItemSummaries`／`findCollectionSummaries` 加 `skip`；`getItemsByType`、`getItemsInCollection`、`getAllCollections` 改為 `getItemsByTypePage`、`getItemsInCollectionPage`（共用 `getItemsPage`，count 與列表同一組條件）、`getCollectionsPage`；dashboard 的 `RECENT_*_LIMIT` 改用 `DASHBOARD_*` 常數。`src/components/pagination/ListPagination.tsx`（只有一頁時不渲染）用在三個列表頁，頁首數量改用 `total`
- 驗證（Development，demo 帳號；**暫時把兩個每頁筆數改成 2**，因為 demo 每個型別最多 6 筆，驗證後已改回 21）：`/items/commands` 顯示總數 5、每頁 2 筆，第 1 頁 Previous 停用、第 3 頁 Next 停用，第 1 頁連結不帶 `?page`；`/items/files?page=99` 顯示最後一頁（FileList 版面）；`/collections?page=abc` 視為第 1 頁；`/collections/[id]?page=2` 正確。改回 21 後只有一頁時不顯示分頁；dashboard 仍為 10 筆 recent items 與最多 6 個 collections；console 無錯誤。`npm test` 296 通過、`npm run build` 通過

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
