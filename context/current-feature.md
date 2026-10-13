# Current Feature: Collection 新增

## Status

In Progress

## Goals

- Top bar 的「New Collection」按鈕（`src/components/dashboard/Topbar.tsx`，目前只是外觀）可以用，點了開啟 modal
- Modal 欄位：name（必填）與 description（選填），送出中顯示 loading、按鈕停用；失敗時保留表單內容
- 成功或失敗都以 toast 提示（成功：`Created "<name>"`）
- 存檔後畫面立即反映新的 collection：dashboard 的 collection 卡片、側邊欄的 collections、統計數字（`router.refresh()`，與新增 item 相同）
- Collection 以使用者為範圍：寫入時 `userId` 取自 session，不接受用戶端傳入；`slug` 在同一使用者內唯一（`@@unique([userId, slug])`），名稱重複時產生不衝突的 slug，不讓 unique 錯誤直接冒到使用者
- 資料存取放在 `src/lib/db/collections.ts`（新增寫入函式，`userId` 為必填參數），server component 繼續直接呼叫 lib/db 讀取
- 輸入以 Zod 驗證（name trim、長度上限；description trim、空字串轉 null、長度上限）
- Free 方案的 collection 數上限 3（project-overview §6），在寫入的 transaction 內檢查且排除已刪除的；判斷集中在 `src/lib/plan.ts`，沿用 `getItemLimit` / `itemLimitMessage` 的形式
- 速率限制沿用 `src/lib/rate-limit.ts`（新增 `createCollection` 項目）
- 單元測試：Zod schema、lib/db 寫入函式（slug 衝突、額度）、建立流程（驗證、未登入、速率限制、錯誤對應）

## Notes

- 來源：inline 描述（`/feature load`）
- **待確認：用戶端呼叫要走 server action 還是 API route。** 描述同時寫了「與 items 相同的做法」和「用戶端呼叫走 api routes」，但兩者不一致：items 的新增、編輯、刪除都是 server action（`src/actions/items.ts`，由 `NewItemDialog` 呼叫）；`src/app/api/items/[id]/file` 與 `api/uploads` 是 API route，因為那裡需要串流或 presigned URL。`coding-standards.md` 也規定「Client components use Server Actions」。建議走 server action（`src/actions/collections.ts`，回傳 `{ success, data, error }`），開工前請確認
- Schema 已有需要的欄位（`name`、`slug`、`description`、`userId`、`deletedAt`），預期**無 migration**。`isFavorite`、`defaultTypeId` 不在這次的 modal 裡
- Slug：沿用 `toTagSlug` 的正規化方式或另寫 `toCollectionSlug`；衝突時加 `-2`、`-3` 後綴
- Collection 數上限：開發期是否也像檔案上傳一樣先對所有人開放？`plan.ts` 的 item 上限目前是實際生效的，預設 collection 上限也生效
- 不做：編輯、刪除、collection 詳細頁、把 item 加進 collection（之後的 feature）
- **決定**：開工時使用者沒有回覆上面兩題，依建議採 server action（`src/actions/collections.ts`），Free 上限照常生效
- 實作：`src/lib/collection-schemas.ts`（name ≤100、description ≤500）、`src/lib/collection-slug.ts`（保留非英文字母；全是符號時為 `collection`；後綴取第一個空號）、`db/collections.ts` 的 `createCollection`（與 createItem 同一個 per-user advisory lock；slug 查詢包含已軟刪除的列）、`plan.ts` 的 `FREE_COLLECTION_LIMIT`／`getCollectionLimit`／`collectionLimitMessage`、rate limit `createCollection` 10 次／分、`src/components/collections/NewCollectionDialog.tsx`
- 順手抽共用：items action 的 `validationFailure` 與錯誤訊息常數移到 `src/lib/action-errors.ts`；`item-schemas.ts` export `optionalText`；`ItemFormFields.tsx` export `errorProps`
- 驗證（Development）：demo 帳號（5 個 collection）送出時顯示上限 toast、dialog 與內容保留；在 Development 註冊測試帳號 `collection-test@devstash.local`，建立「  React Patterns  」＋描述 → 名稱去空白、toast、卡片、側邊欄 Recent Collections 與統計同步更新；再建立「react patterns!」→ slug 為 `react-patterns-2`、description 為 null（SQL 確認）；console 無錯誤。`npm test` 237 通過、`npm run build` 通過（資料頁仍為動態）
- 已知：demo 帳號 seed 了 5 個 collection，超過 Free 上限 3，在 demo 帳號上無法新增 collection。測試帳號可用 `npm run db:prune-users -- --confirm` 清除

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
