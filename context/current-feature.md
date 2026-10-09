# Current Feature: Code Scan Fixes (M1, M2, L1)

## Status

In Progress

## Goals

- M1：item 的新增、編輯、刪除在 server action 被 reject（網路中斷、body 超過 1 MB、舊分頁）時顯示提示並保留表單，不再整頁崩潰；加上根目錄 `error.tsx` 作為最後防線
- M2：title、description、標籤有長度與數量上限，錯誤顯示在欄位上
- L1：以 storageKey 查 item 的兩個查詢帶上 userId
- 稽核報告存成 `docs/audit-results/CODE_SCAN_REVIEW.md`

## Notes

- 來源：code-scanner 稽核（`master` 的 `306681e`），使用者指定先修 M1、M2、L1 並保存報告；所有項目已對照原始碼確認
- M1：新增 `src/lib/server-action.ts` 的 `callServerAction`（reject 時 `console.error` 並回傳 null）與 `SERVER_UNREACHABLE_MESSAGE`（同時提到網路與內容過大，因為 body 超過上限時重試沒用）；`ItemEditForm`、`NewItemDialog` 以 toast 顯示、`DeleteItemDialog` 顯示在對話框內，三者都保留狀態。`error.tsx` 放在 `src/app/` 而非報告建議的 `(app)/`：`error.tsx` 不包住同層 layout，New Item dialog 與 drawer 都在 `(app)/layout.tsx` 底下；Next 16 的 prop 為 `retry`
- M2：`TITLE_MAX_LENGTH` 200、`DESCRIPTION_MAX_LENGTH` 2,000、`TAG_MAX_LENGTH` 50、`MAX_TAGS` 20（採報告建議值），長度以 trim 後計算，標籤數量以去重前計算
- L1：`isStorageKeyInUse(userId, storageKey)`；`createItem` lock 內的檢查也帶 `userId`
- 驗證（Development，demo 帳號）：編輯 prompt 填入 201 字標題、2,001 字描述、21 個標籤時三個欄位各自顯示錯誤；Content 貼 1.2 MB 按 Save 時 Next 回「Body exceeded 1 MB limit」，畫面顯示提示、仍在編輯模式且 1.2 MB 內容保留、沒有錯誤頁；離線時 Create 顯示提示且 dialog 與標題保留、Delete 在對話框內顯示訊息；之後以 Neon 查詢確認沒有任何 item 被建立、修改或刪除。`npm test` 201/201（新增 `server-action.test.ts` 2 個、`item-schemas.test.ts` 2 個，`items.test.ts`、`uploads.test.ts` 改為驗證 userId）、tsc、lint、build 通過
- 已知情況：`error.tsx` 只確認能編譯，沒有在瀏覽器觸發；卡片上的描述在 2,000 字元時仍會完整顯示（報告建議的 `line-clamp-2` 未做，屬於版面調整）；既有資料若超過新上限，編輯時要先縮短才能儲存（Development 查無超過上限的標題）

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
