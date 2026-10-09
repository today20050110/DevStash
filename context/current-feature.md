# Current Feature: Code Scan Duplicate Code

## Status

In Progress

## Goals

- 處理稽核報告列出的 8 處重複程式碼，抽成共用元件或函式，行為不變

## Notes

- 來源：`docs/audit-results/CODE_SCAN_REVIEW.md` 的「重複的程式碼」，使用者指定處理
- 處理：
  1. 型別圖示方塊 ×3 → `src/components/dashboard/TypeIconTile.tsx`（`ItemCard`、`/items/[type]` 頁首、`ItemDrawer`）
  2. 檔案網址 ×3、7. `/api/items/:id` 回應解析 ×2 → `src/lib/item-api.ts` 的 `itemApiUrl`、`itemFileUrl`、`fetchItemDetail`（原本在 `use-item-detail.ts` 的型別與解析搬過去）；`CopyItemButton` 改用 `fetchItemDetail`，順帶修正它原本不檢查 `success`、日期仍是字串的問題
  3. API route 的 `errorResponse` → `src/lib/api-response.ts` 的 `apiError(error, status, headers?)` 與 `ApiResponse<T>`；報告列 3 處，另有 `api/auth/register/route.ts` 一處（含 429 + `Retry-After`），共 4 處都改用；各 route 的回應型別改為 `ApiResponse<...>`
  4. Zod 驗證失敗的回應 ×2 → `actions/items.ts` 的 `validationFailure`
  5. Free 方案額度訊息 ×2 → `plan.ts` 的 `itemLimitMessage`
  6. tags 的 select 與轉換 ×2 → `db/items.ts` 的 `ownedTagNames(userId)`（`satisfies Prisma.ItemTagFindManyArgs`）與 `toTagNames`
  8. Pin／Star 圖示 ×2 → `src/components/items/ItemStatusIcons.tsx`
- 格式化只對 master 上原本就符合 Prettier 的檔案執行 `--write`，避免無關的排版變動
- 驗證：curl 未登入呼叫 `/api/items/x`、`/api/items/x/file`、`/api/uploads` 皆回 `{"success":false,"error":"Unauthorized"}` 401，`/api/auth/register` 送非 JSON 回 400 與原訊息；Playwright（demo 帳號，Development）dashboard 17 個型別方塊與 Pin 圖示、`/items/snippets` 頁首方塊的底色、drawer 載入標題與日期、卡片快速複製取得 Dockerfile 內容、Images 頁三張縮圖載入、Files 頁下載連結回 200。新增 `src/lib/item-api.test.ts`（5 個）、`src/lib/api-response.test.ts`（2 個），`npm test` 212/212、tsc、lint、build 通過
- 已知情況：編輯途中開著的 dev 分頁經 HMR 出現暫時性錯誤（`TypeIconTile is not defined`、`itemLimitMessage` 尚未匯出），最後一輪驗證時沒有錯誤；client 端的 `RegisterForm`、`FileUpload` 仍各自宣告回應型別（報告未列，未改）

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
