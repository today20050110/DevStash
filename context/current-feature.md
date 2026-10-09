# Current Feature: Code Scan Fixes (L3, L6)

## Status

In Progress

## Goals

- L3：沒有 content／url 可複製的 item，卡片上不顯示複製按鈕（與 drawer 停用 Copy 的行為一致）
- L6：重跑 demo seed 時，被硬刪除的檔案 item 先登記到 `PendingDeletion`，R2 物件不再成為孤兒

## Notes

- 來源：`docs/audit-results/CODE_SCAN_REVIEW.md` 的 L3、L6，使用者指定修正
- L3：列表刻意不載入 content，Prisma 又無法 select 計算欄位；`findItemSummaries` 在主查詢後以 `findCopyableItemIds` 再查一次（`id in` 同一批、同一個 `userId`、`content` 或 `url` 非 null 且非空字串，只 select id），整個列表只多一次查詢、列表為空時不查。`ItemSummary` 新增 `hasCopyValue`，`ItemCard` 改依它顯示 `CopyItemButton`（取代原本的 `!item.file`；檔案 item 沒有 content／url，自然為 false）
- L6：`src/lib/db/user-deletion.ts` 抽出 `queueFileDeletions(tx, where)`（查有 storageKey 的 item 並 `pendingDeletion.createMany`），`deleteUsersAndContent` 改用它；`prisma/seed.ts` 在 `tx.item.deleteMany` 前呼叫。seed 以相對路徑 import，該檔只有型別層級的 `@/` import（執行期不需要路徑別名）
- 驗證（Development，demo 帳號）：以 New Item 建立只有標題的 note「L3 empty note」，`/items/notes` 與 dashboard 上該卡片沒有複製按鈕，snippets（4）、links（6）與 dashboard 上有內容的卡片都有，圖片與檔案卡片沒有；測試後以 app 刪除（軟刪除）。L6 沒有實際執行 seed——`SEED_DEMO=1` 會清掉使用者要求保留的 8 筆測試圖片與檔案——改以 `user-deletion.test.ts` 單元測試與 tsc（`prisma/seed.ts` 在 tsconfig 範圍內）確認，`npm run db:prune-users` 預演正常。`npm test` 205/205（`items.test.ts` 補 2 個、新增 `user-deletion.test.ts` 2 個）、tsc、lint、build 通過
- 已知情況：「L3 empty note」以軟刪除留在 Development；`prisma/seed.ts` 本來就沒有以 Prettier 格式化，本次未整檔格式化

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
