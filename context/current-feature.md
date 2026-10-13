# Current Feature: Collections 頁面

## Status

In Progress

## Goals

- `/collections`：列出使用者所有未刪除的 collections，沿用 `CollectionCard`，排版與 dashboard 的 collection 區塊相同；頁首顯示總數，沒有 collection 時顯示提示
- `/collections/[id]`：顯示該 collection 的名稱、描述、item 數，以及裡面的 items，沿用 `ItemCard`（圖片用 `ImageCard`，與 `/items/[type]` 相同的逐筆判斷與 container query 欄數）；點卡片開啟既有的 item drawer
- 不屬於目前使用者、不存在或已軟刪除的 collection 回 404（`notFound()`），與 `/items/[type]` 對其他使用者自訂型別的處理相同；只列出未刪除的 items
- 側邊欄「View all collections」連到 `/collections`；側邊欄的每個 collection、`CollectionCard`（dashboard 與 `/collections`）都連到 `/collections/[id]`
- `CollectionCard` 整張卡片可點（目前只有名稱是連結）
- 資料由 server component 以 lib/db 函式取得，`userId` 為必填參數：全部 collections 沿用 `findCollectionSummaries`；單一 collection 的標頭資料與其 items（沿用 `findItemSummaries`，以 `collections: { some: { collectionId } }` 篩選）
- 頁面與 dashboard 相同以 `connection()` 宣告動態渲染，未登入時導回登入頁並帶 `callbackUrl`
- `generateMetadata` 的標題用 collection 名稱，與頁面共用 `cache()` 包起來的查詢
- 單元測試：新增的 lib/db 函式（擁有者與 deletedAt 條件、篩選條件）

## Notes

- 來源：inline 描述（`/feature load`）
- **網址用 id 還是 slug**：描述寫 `/collections/[id]`，但目前側邊欄與 `CollectionCard` 的連結已經是 `/collections/${slug}`，且 slug 在同一使用者內唯一（上一個 feature 為此做了去重）。預設照描述改用 id；slug 的網址較好讀，但改名時網址會變（目前沒有改名功能）
- 「View all collections」（側邊欄）與 dashboard 的「View all」已經指向 `/collections`，只是頁面不存在而 404；這次補上頁面即可
- 不做：collection 的編輯、刪除、收藏切換、從 collection 頁移除 item、分頁、排序選項
- items 依建立時間由新到舊（`findItemSummaries` 只能依 item 本身的欄位排序；依 `ItemCollection.addedAt` 或 `position` 排序留給之後）
- 預期**無 migration**
- **決定**：使用者未指定，照描述用 id（側邊欄兩處與 `CollectionCard` 的 `/collections/${slug}` 改為 `${id}`）
- 實作：`db/collections.ts` 新增 `getAllCollections`（沿用 `findCollectionSummaries`，不限數量）與 `getCollectionById`（`CollectionHeader`：id、name、description、isFavorite）；`db/items.ts` 新增 `getItemsInCollection`（`collections: { some: { collectionId } }`）。`/items/[type]` 的卡片網格抽成 `src/components/items/ItemGrid.tsx`，兩個列表頁共用。`CollectionCard` 以名稱連結的 `after:absolute after:inset-0` 撐滿整張卡片（卡片加 `relative` 與 `has-focus-visible` ring），連結的無障礙名稱仍只有 collection 名稱。新路由要 `npx next typegen` 才有 `PageProps<"/collections/[id]">`
- 驗證（Development，測試帳號）：側邊欄「View all collections」→ `/collections` 列出 2 張卡片與總數；點卡片 → `/collections/{id}`，標題、描述、item 數與 snippet 卡片正確，點 item 開啟 drawer；側邊欄 collection 連結 → 空 collection 顯示提示；以 demo 帳號的 collection id 直接開啟 → HTTP 404（console 只有該 404 回應）。Playwright 點卡片描述時回報被連結的覆蓋層攔截，證實整張卡片可點。`npm test` 255 通過、`npm run build` 通過（兩個新頁面為動態）

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
