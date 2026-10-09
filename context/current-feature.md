# Current Feature: Code Scan Fixes (L4, L7)

## Status

In Progress

## Goals

- L4：減少每個頁面請求重複或串列的查詢（User 表只讀一次、系統型別在同一請求內只查一次、`prepareUpload` 不多算收藏數）
- L7：把 524 行的 `src/lib/db/items.ts` 依職責拆成型別查詢、讀取、寫入三個檔案，測試跟著拆

## Notes

- 來源：`docs/audit-results/CODE_SCAN_REVIEW.md` 的 L4、L7，使用者指定處理
- L4：`getCurrentUser` 一併 select `plan`、`subscriptionStatus`、`currentPeriodEnd`，以 `plan.ts` 的 `isPro` 計算，`CurrentUser` 新增 `isPro`（`UserProfile` 改為 `Omit<CurrentUser, "isPro">`）；`(app)/layout.tsx` 改用 `user.isPro`，不再呼叫 `getUserIsPro`。`getSystemItemTypes`、`getSystemItemTypesWithCounts` 以 React `cache()` 包起來（layout 的側邊欄與 `/profile` 頁面同一個請求只查一次）。新增 `countActiveItems(userId)`，`prepareUpload` 改用它，不再呼叫會多算收藏數的 `getItemCounts`。server action 裡的 `getUserIsPro` 未改（報告未列；`cache()` 只在 RSC 請求內去重）
- L7：以腳本依標記把原檔的函式原樣搬到 `item-types.ts`（137 行）、`items.ts`（263 行，讀取）、`item-mutations.ts`（186 行，寫入；`updateItem` 從 `items.ts` import `getItemDetail`），只補上各檔的 import 與開頭說明；`items.test.ts` 同樣依 `describe` 拆成三個測試檔（13＋18＋1，原本 32 個全數保留）。呼叫端（actions、uploads、layout、AppSidebar、profile、`/items/[type]`）與 mock 改為新路徑
- Prettier `--write` 曾改到 `profile/page.tsx`、`AppSidebar.tsx` 兩段無關的 `Promise.all` 排版，已還原這兩檔並只重新套用 import 修改
- 驗證（Development，demo 帳號）：dashboard 統計 27 items／5 collections 與側邊欄各型別數量（4／4／5／0／5／3／6）加總一致；New Item 列出 7 種型別（含 Files、Images）；`/profile` 的總數與各型別數量一致；`/items/images` 3 items。`npm test` 205/205、tsc、lint、build 通過
- 已知情況：重構途中開著的 dev 分頁經 HMR 出現 81 則「模組沒有某個 export」的錯誤（舊 import 暫時指向已搬走的函式），最後一輪驗證時 0 errors；沒有量測實際查詢次數，只依程式碼確認去重

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
