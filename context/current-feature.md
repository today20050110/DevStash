# Current Feature: Settings 頁面

## Status

In Progress

## Goals

- 新增 `/settings` 頁面（放在 `src/app/(app)/settings/page.tsx`，沿用登入後的側邊欄與頂部列 layout）
- `/settings` 受保護：`src/proxy.ts` 的 matcher 加上 `/settings/:path*`，頁面本身也像 `/profile` 一樣以 `getCurrentUserId()` 再擋一次（帳號已刪除但 JWT 未過期的情況），未登入導向 `SIGN_IN_PATH?callbackUrl=/settings`
- 側邊欄底部使用者下拉選單（`src/components/dashboard/UserMenu.tsx`）在 Profile 下方加上 Settings 連結（Lucide `Settings` 圖示）
- 把 `/profile` 的 Account 區塊（Change password 卡片、Delete account 卡片）整段移到 `/settings`；`/profile` 只留 ProfileInfo 與 Usage
- 變更密碼成功後的 redirect 從 `/profile?passwordChanged=1` 改為 `/settings?passwordChanged=1`（`src/actions/profile.ts`），成功訊息在 settings 頁顯示
- Change password 卡片仍只在 `hasPassword` 為 true 時顯示（純 GitHub OAuth 帳號沒有密碼）

## Notes

- 來源：inline 描述（「Create a settings page. Add a link for settings in the user icon dropdown at the bottom of the sidebar. The URL should be /settings and should be protected. Move the Account actions, which include the delete account and forgot password from the profile to the settings page.」）
- 描述寫「forgot password」，但 profile 頁的 Account 區塊實際上是 **Change password**（輸入目前密碼再設定新密碼）；忘記密碼流程在登入頁，不在 profile。依此解讀為搬移 Change password 與 Delete account 兩張卡片
- **無 migration**：只搬 UI 與 redirect 路徑
- 預設不搬檔案：`ChangePasswordForm`、`DeleteAccountDialog` 留在 `src/components/profile/`、action 留在 `src/actions/profile.ts`，避免無關的重新命名；若要改放 `components/settings/` 再另議
- settings 頁需要的資料只有 `email` 與 `hasPassword`，用既有的 `getUserProfile(userId)` 取得，不查 items／collections 統計
- `src/actions/profile.test.ts`（若有）中對 `/profile?passwordChanged=1` 的斷言要跟著改
- 驗證（2026-10-17）：`npm test` 30 檔／296 項通過、`npm run build` 通過（`/settings` 為 ƒ 動態）。瀏覽器以 demo 帳號實測：選單有 Profile／Settings／Sign out，`/settings` 顯示兩張卡片，`/profile` 只剩個人資訊與 Usage；未登入 `curl /settings` 回 307 到 `/sign-in?callbackUrl=%2Fsettings`；在 Development 把 demo 密碼改成暫時值，回到 `/settings?passwordChanged=1` 並顯示成功訊息，再改回 `12345678`。Delete account 未實際按下（會刪掉 demo 帳號）；元件本身未改動
- 範圍外但順帶發現：`src/proxy.ts` 的 matcher 沒有 `/collections/:path*`，collections 頁面只靠頁面內的檢查擋未登入者；本次不處理，另開 fix

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
