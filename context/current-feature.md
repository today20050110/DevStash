# Actions 重複程式碼整理

## Status

In Progress

## Goals

- 新增 `src/lib/signed-in-action.ts` 的 `withSignedInUser(logLabel, run)`：取 userId、未登入回 `NOT_SIGNED_IN_MESSAGE`、例外時 log 並回 `GENERIC_ERROR_MESSAGE`；`items.ts`（5 處）、`collections.ts`（4 處）、`editor-preferences.ts`（1 處）改用它，並補 `src/lib/signed-in-action.test.ts`
- 新增 `src/types/action.ts` 的 `ActionResult<T>`（`{ success, data?, error? }`）；actions 與 `src/types/` 各自宣告的回應型別改為以它定義，名稱不變；`src/lib/api-response.ts` 的 `ApiResponse<T>` 改為重新匯出
- `items.ts` 的 `fieldError` 改為泛型，`updateItem` 的兩處手寫欄位錯誤改用它
- `src/lib/password-reset.ts` 新增產生「重設密碼後回登入頁」網址的函式，`password-reset.ts` 與 `profile.ts` 改用
- `profile.ts`、`password-reset.ts` 改用 `src/lib/action-errors.ts` 的 `NOT_SIGNED_IN_MESSAGE`、`GENERIC_ERROR_MESSAGE`，移除各自的常數
- 行為不變：既有 action 測試全數通過

## Notes

- 來源：2026-10-27 refactor-scanner 掃描 `src/actions` 的報告，使用者同意全部處理
- `withSignedInUser` 不能放進 `action-errors.ts`：`src/components/settings/EditorPreferencesProvider.tsx`（client）會 import 它，加入 `getCurrentUserId` 會把 auth 與 Prisma 帶進 client bundle
- `ai.ts` 的 `checkAiGate`／`runAiFeature` 自成一套，`profile.ts` 用 `getCurrentUser()`，都不改用 `withSignedInUser`
- `updateItem` 中關於 sessionVersion 的註解搬到 helper 的 JSDoc
- 不處理（報告中「查過但不建議抽」）：速率限制回應、兩個改密碼表單的欄位錯誤、favorite／delete 的 item 與 collection 版本合併、測試檔 mock
- 範圍外但順手：`toggleItemPin` 用 inline `z.boolean()`，同檔改用 `isFavoriteSchema` 這類共用 schema
- **實作備註**：
  - `withSignedInUser` 回傳 `R | { success: false; error }`，各 action 的宣告回傳型別不變；`items.ts` 的 `isFavoriteSchema` 改名 `booleanSchema`，收藏與釘選共用
  - `ActionResult<T = never>`：無 data 的回應（`DeleteItemResult`、`DeleteCollectionResult`、`DeleteAccountState`）用預設；有 `fieldErrors` 的用 `extends`；`ChangePasswordState` 也改為 `extends ActionResult`。`ForgotPasswordState`、`ResetPasswordState`（有 `message`／`linkInvalid`）與 `auth.ts` 未改
  - `passwordResetSignInPath(email)` 放在 `src/lib/password-reset.ts`（新增 `SIGN_IN_PATH` import）；`profile.ts` 仍用 `SIGN_IN_PATH` 組刪除帳號的網址
- **驗證**：tsc、eslint 無錯誤；`npm test` 50 檔、519 項（新增 `signed-in-action.test.ts` 3 項，既有 action 測試未改動即通過）；`npm run build` 通過；瀏覽器（Development，demo）在 Snippets 對「useDebounce & useLocalStorage」收藏再取消，兩次 toast 正確、狀態還原（`updatedAt` 因此更新）。淨減少約 100 行

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
