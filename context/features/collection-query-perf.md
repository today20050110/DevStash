# Collection 查詢效能

來源：2026-09-20 的程式碼掃描，findings H1 與 M1。

## Overview

`src/lib/db/collections.ts` 的 `findCollectionSummaries` 為了得出「item 數量」與
「型別組成」兩項摘要，把每個 collection 底下**所有** item 的關聯列整個載入記憶體。
同一次 `/dashboard` 請求又會呼叫它三次（side bar 兩次、主區一次），範圍彼此重疊。

改用資料庫端聚合，並讓同一請求內只查一次。

## Requirements

### H1 — 聚合移到資料庫

- item 數量改用 Prisma 的 `_count`，不再載入關聯列
- 型別組成改用一句 `$queryRaw`，以 `collectionId × itemTypeId` 分組：

  ```sql
  SELECT ic."collectionId",
         it.id, it.name, it.slug, it.icon, it.color,
         COUNT(*)::int AS count
  FROM "ItemCollection" ic
  JOIN "Item"     i  ON i.id  = ic."itemId"
  JOIN "ItemType" it ON it.id = i."itemTypeId"
  WHERE i."userId" = $1
    AND i."deletedAt" IS NULL
    AND ic."collectionId" IN (...)
  GROUP BY ic."collectionId", it.id
  ```

- `COUNT(*)` 必須 `::int`，否則 Prisma 以 BigInt 回傳，`CollectionTypeSummary.count`
  的型別對不上
- 回傳列數上限從「item 總數」降為「collection 數 × 7」

### M1 — 同一請求只查一次

- 新增 `getCollectionSummaries(userId)`，以 React `cache()` 包住，取得該使用者
  全部未刪除的 collection（含數量與型別組成）
- `getRecentCollections`、`getFavoriteCollections`、
  `getRecentNonFavoriteCollections` 改為對這份結果做記憶體篩選與切片
- `cache()` 的鍵是參數的識別性，所以只能傳純量 `userId`，不能傳 `where` 物件

### 不變的部分

- `CollectionSummary` 與 `CollectionTypeSummary` 的形狀完全不動
- 三個 export 的函式簽章與回傳值語意不動
- 排序規則不動：collection 依 `createdAt` 由新到舊、同值以 `id` 決勝；
  型別依數量由多到少、同值以名稱決勝
- `userId` 維持必填、一律排除 `deletedAt`，item 關聯另限制 `item.userId`
- **任何 UI 元件都不需要改**（`CollectionCard`、`AppSidebar` 只讀既有欄位）

## 明確不做

- `getPinnedItems` 沒有上限（掃描 findings 的 M2）—— 屬 item 側，另開
- `AppSidebar.tsx` 的拆檔（M3）
- `prisma/seed.ts` 的資料／邏輯分離（M4）
- 任何 migration 或 schema 改動

## 取捨（需明確記錄）

改完後 `getCollectionSummaries` 會取回該使用者**全部**的 collection，SQL 層的
`LIMIT` 消失，改在記憶體切片。代價與理由：

- 代價：collection 很多的使用者，取回的列數從「≤10」變成「全部」
- 理由：這些列現在只有 6 個純量欄位（不再帶 item 關聯），Free 方案上限是 3 個
  collection，而同一請求的三次重疊查詢會收斂成 2 次往返
- 若日後有使用者多到這件事會痛，再加上限即可；屆時 `take` 應回到 SQL 層

## 驗證方式

- 以 demo 資料比對改動前後的輸出完全一致：5 個 collection 的 `itemCount`、
  `types` 的順序與每個型別的 `count`、卡片邊框色、側邊欄圓點色
- 空的 collection（0 筆 item）仍為 `itemCount: 0`、`types: []`
- 計算單次 `/dashboard` 請求的查詢次數，確認 collection 相關的查詢從 3 組降為 2 次
- 桌面與 390px 手機瀏覽器實測，主控台無錯誤或警告
- `tsc --noEmit`、`npm run lint`、`npm run build`、`npm run test:db`
