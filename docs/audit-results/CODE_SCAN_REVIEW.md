# Code Scan Review

- **稽核日期**：2026-10-10（稽核對象為 `master` 的 `306681e`）
- **稽核方式**：`code-scanner` agent 掃描，所有項目再由主 session 對照原始碼確認；排除尚未實作的功能、已確認的設計決定、NextAuth／Next.js 已處理的部分，以及 `AUTH_SECURITY_REVIEW.md` 已處理或已接受的項目
- **稽核範圍**：`src/`（不含 `src/generated`）、`prisma/seed.ts`、`scripts/`
- **結果摘要**：Critical 0／High 0／Medium 2／Low 7，另有 8 處重複程式碼
- **處理狀態**：M1、M2、L1 已於 `fix/item-input-limits` 修正；其餘未處理

## Medium

### M1. item 的新增、編輯、刪除沒有處理 server action 被 reject 的情況（已修正）

- **位置**：`src/components/items/ItemEditForm.tsx`、`NewItemDialog.tsx`、`DeleteItemDialog.tsx` 的 `startTransition(async () => await action())`
- **問題**：action 內的 try/catch 只處理伺服器端錯誤。網路中斷、平台 5xx、部署後舊分頁的 action ID 失效、request body 超過 `serverActions.bodySizeLimit`（預設 1 MB）時，client 端的 promise 會 reject，往上丟到 error boundary；專案原本沒有任何 `error.tsx`，結果是 Next 預設的「Application error」整頁錯誤，drawer 裡未儲存的編輯消失
- **重現**：編輯 prompt，在 Content 貼上 1.2 MB 文字後按 Save——Next 在 Zod 與 `checkContentSize` 之前就以「Body exceeded 1 MB limit」拒絕
- **修正**：新增 `src/lib/server-action.ts` 的 `callServerAction`（reject 時記 log 並回傳 null），三處改用它，null 時以 toast（刪除則在對話框內）顯示訊息並保留表單；新增 `src/app/error.tsx` 作為最後防線——放在根目錄而非 `(app)`，因為 `error.tsx` 不包住同層的 `layout.tsx`，而 New Item dialog 與 drawer 都掛在 `(app)/layout.tsx` 底下

### M2. 標題、描述、標籤沒有長度或數量上限（已修正）

- **位置**：`src/lib/item-schemas.ts`
- **問題**：列表查詢刻意不載入 `content`，但每次都載入 `description` 與全部標籤；description 沒有上限，等於繞過 content 的 100 KB 上限。50 筆各接近 1 MB 的描述會讓 dashboard 與列表頁每次載入數十 MB；一次送幾千個標籤會在 transaction 內逐一 upsert，卡片也全部渲染
- **修正**：title 200 字元、description 2,000 字元、單一標籤 50 字元、最多 20 個標籤（`TITLE_MAX_LENGTH`、`DESCRIPTION_MAX_LENGTH`、`TAG_MAX_LENGTH`、`MAX_TAGS`），錯誤顯示在對應欄位

## Low

### L1. 以 storageKey 查 item 時沒有帶 userId（已修正）

- **位置**：`src/lib/db/items.ts` 的 `isStorageKeyInUse` 與 `createItem` 在 advisory lock 內的再次檢查
- **問題**：`where: { storageKey }` 沒有可用的索引（Item 的索引都以 `userId` 開頭），每建立一筆檔案 item 就對全站 Item 表做兩次循序掃描，其中一次在持有鎖時；也是 `project-overview.md` §4.3 的例外
- **修正**：兩處都加上 `userId`。key 內含 userId 且呼叫端已以 `isOwnStorageKey` 確認，語意不變

### L2. 取得上傳網址期間關閉 dialog 或切換型別，上傳不會中止

- **位置**：`src/components/items/FileUpload.tsx`（unmount 時 `xhrRef.current?.abort()`；`await requestUploadUrl(...)` 期間 `xhrRef.current` 仍是 null）
- **情境**：選圖後在簽發網址的往返內關閉 dialog 或切換型別，之後仍會 PUT 到 R2 並 `onChange`，把結果寫回已重設的表單。伺服器端有驗證，不是安全問題
- **建議**：effect 內以 `cancelled` ref 標記，`requestUploadUrl` 回來後先檢查；或讓 fetch 帶 `AbortController.signal`

### L3. 沒有 content 的 TEXT item，卡片上的複製按鈕一定失敗

- **位置**：`src/components/dashboard/ItemCard.tsx`（只依 `!item.file` 顯示）、`src/components/items/CopyItemButton.tsx`
- **情境**：只有標題的 note／snippet 也顯示複製按鈕，點了多一次 API 請求後跳出「Couldn't copy …」；drawer 的 Copy 在沒有值時是停用的，兩邊不一致
- **建議**：列表補一個 `hasCopyValue`（例如 `content IS NOT NULL` 的計算欄位，或補上短字串 `url`）

### L4. 每個頁面請求都有重複或串列的查詢

- `src/app/(app)/layout.tsx`：`getCurrentUser()`、`getUserIsPro()`、`getCreatableItemTypes()` 三個串列往返，User 表讀兩次
- `/profile` 一次請求查了三次系統型別（layout、sidebar、page），`groupBy` 也重複一次
- `src/lib/uploads.ts` 的 `prepareUpload` 呼叫 `getItemCounts`，多跑一次用不到的 favorites `count`
- **建議**：`getCurrentUser` 一併 select 方案欄位、以 `isPro` 在記憶體判斷；`getSystemItemTypes`／`getSystemItemTypesWithCounts` 以 React `cache()` 包起來；`prepareUpload` 改用單一 `count`

### L5. react-markdown 與 remark-gfm 在每個登入後的頁面一開始就載入

- **位置**：`src/components/items/ItemFormFields.tsx`、`ItemDrawerSections.tsx` 靜態 import `MarkdownEditor`，經由 layout 的 `Topbar → NewItemDialog` 與 `ItemDrawerProvider → ItemDrawer` 引入
- **量測**：含 micromark 的 chunk 約 181 KB（gzip 約 55 KB），出現在 dashboard、`/items/[type]`、`/profile`
- **建議**：比照 `CodeEditor`，以 `next/dynamic` 延後載入

### L6. 重跑 demo seed 會讓 R2 物件成為孤兒

- **位置**：`prisma/seed.ts` 的 `tx.item.deleteMany({ where: { userId } })`
- **問題**：同樣是硬刪除，`deleteUsersAndContent`（`src/lib/db/user-deletion.ts`）會先把有 `storageKey` 的 item 寫進 `PendingDeletion`，seed 沒有。Development 的 demo 帳號目前保留 3 張圖片與 5 個檔案的測試物件，下一次 `SEED_DEMO=1` 就會失去所有參照
- **建議**：deleteMany 之前比照 user-deletion 寫入 `pendingDeletion.createMany`

### L7. `src/lib/db/items.ts`（524 行）可以拆分

型別查詢、列表與單筆讀取、寫入、檔案相關四類職責放在同一檔。建議拆成 `db/item-types.ts`、`db/items.ts`（讀取）、`db/item-mutations.ts`，測試檔跟著拆。

## 重複的程式碼

1. 型別圖示方塊（`color-mix` 背景 + 型別色）×3：`ItemCard.tsx`、`app/(app)/items/[type]/page.tsx`、`ItemDrawer.tsx`
2. 檔案網址 `` `/api/items/${encodeURIComponent(id)}/file` `` ×3：`ImageCard.tsx`、`ItemDrawerSections.tsx`、`FileList.tsx`
3. API route 的 `errorResponse` ×3：`api/items/[id]/route.ts`、`api/items/[id]/file/route.ts`、`api/uploads/route.ts`
4. Zod 驗證失敗時組回應的區塊 ×2：`actions/items.ts` 的 `createItem` 與 `updateItem`
5. Free 方案額度訊息 ×2：`actions/items.ts`、`lib/uploads.ts`
6. tags 的 select 與轉換 ×2：`db/items.ts` 的 `findItemSummaries` 與 `getItemDetail`
7. `fetch('/api/items/:id')` 的回應解析 ×2：`hooks/use-item-detail.ts`、`CopyItemButton.tsx`（後者不檢查 `success`，型別宣告為 `ItemDetail` 但日期實際是字串）
8. Pin／Star 狀態圖示 ×2：`ItemCard.tsx`、`ImageCard.tsx`

## 查過、沒有問題的部分

- **資料存取權限**：`findItemSummaries`、`getItemDetail`、`updateItem`、`softDeleteItem`、`getItemFile`、`findCollectionSummaries` 都帶 userId；join table 另外限制 `tag.userId`、`collection.userId`；`getItemTypeBySlug`、`findCreatableItemType` 查不到別人的自訂型別
- **上傳流程**：key 由伺服器產生、`isOwnStorageKey` 綁定 userId、建立時以 HeadObject 比對實際大小與 Content-Type、presigned URL 簽入 content-length 與 content-type、額度在 advisory lock 內檢查
- **下載代理**：驗登入、速率限制與擁有者；nosniff、attachment、CSP sandbox；`contentDisposition` 的 RFC 5987 處理正確
- **XSS**：URL 欄位與 markdown 的連結、圖片只接受 http(s)，沒有 rehype-raw；email 範本的 href 有跳脫
- **AUTH_SECURITY_REVIEW 的 Low**：已修正，`signInIp`、`resendVerificationIp` 經 `checkRateLimits` 生效
- **列表沒有 N+1**：型別與 tags 隨 item 一次載入，側邊欄數量用一次 `groupBy`；`getItemsByType` 沒有 `take`，但 Free 方案最多 50 筆
- **Monaco**：已以 `next/dynamic`（`ssr: false`）延後載入
- **相依套件與 env 檔**：沒有未使用的相依；env 檔沒有進版控
- **`scripts/prune-users.ts`**：有 production endpoint 防護，與帳號刪除共用 `deleteUsersAndContent`

## 給日後的提醒

`PRO_CONTENT_LIMIT_BYTES` 是 1 MB，等於 server action 預設的 body 上限。Pro 上線後接近 1 MB 的 content 會在 Zod 之前被框架拒絕（現在會顯示 M1 的提示而不是欄位錯誤），Stripe 上線時要一併調整 `next.config.ts` 的 `serverActions.bodySizeLimit`。
