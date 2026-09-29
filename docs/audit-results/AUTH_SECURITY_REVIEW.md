# Auth Security Review

- **最後稽核日期**：2026-09-30（稽核對象為 `master` 的 `c5d9b24`）
- **稽核範圍**：
  - 設定：`src/auth.ts`、`src/auth.config.ts`、`src/proxy.ts`、`src/types/next-auth.d.ts`
  - Server Actions：`src/actions/auth.ts`、`src/actions/password-reset.ts`、`src/actions/profile.ts`
  - API routes：`src/app/api/auth/register/route.ts`、`src/app/api/auth/verify-email/route.ts`
  - 函式庫：`src/lib/rate-limit.ts`、`src/lib/password.ts`、`src/lib/tokens.ts`、`src/lib/email.ts`、`src/lib/email-verification.ts`、`src/lib/password-reset.ts`、`src/lib/auth-errors.ts`、`src/lib/auth-schemas.ts`、`src/lib/redirect.ts`、`src/lib/current-user.ts`、`src/lib/search-params.ts`、`src/lib/db/users.ts`、`src/lib/db/user-deletion.ts`
  - 頁面：`src/app/(app)/layout.tsx`、`src/app/(app)/profile/page.tsx`、`src/app/(auth)/sign-in/page.tsx`、`src/app/(auth)/reset-password/page.tsx`；元件以 Grep 檢查表單欄位（`src/components/auth/**`、`src/components/profile/**`）
  - 資料模型：`prisma/schema.prisma`（`User`、`VerificationToken`）
  - 第三方原始碼與文件：`node_modules/@upstash/ratelimit/dist/index.mjs`（`limit()` 的錯誤與逾時處理、ephemeral cache 預設值）、Vercel Request headers 文件、Upstash 定價與 `max requests limit exceeded` 文件
- **結果摘要**：Critical 0／High 0／Medium 0／Low 1

## 上次稽核三項的查證結果

| 項目 | 結果 | 依據 |
| --- | --- | --- |
| Medium：重設密碼後既有 JWT 不失效 | **已正確修正** | `jwt` callback 只在登入時（`user?.id`）從資料庫讀版本（`src/auth.ts:82-91`），刻意不處理 `trigger === "update"`，所以 `POST /api/auth/session` 無法把舊 token 升到新版本；proxy 用的是預設 `jwt` callback（原樣回傳 token），不會丟掉欄位。`getCurrentUser()` 比對版本（`src/lib/current-user.ts:32`），所有登入後的進入點都經過它：`(app)/layout.tsx:13`、`profile/page.tsx:31`、`actions/profile.ts:54,132`，沒有其他地方直接使用 `auth()` 回傳的 session。重設（`src/lib/password-reset.ts:115-118`）與變更（`src/actions/profile.ts:85-93`）都在 transaction 內將版本加一。 |
| Medium：沒有速率限制 | **已修正，有一個新的邊界問題（見下方 Low）** | 登入放在 `authorize`（`src/auth.ts:26-32`），直接呼叫 `/api/auth/callback/credentials` 也會經過；註冊（`register/route.ts:42`）、申請重設（`actions/password-reset.ts:50`）、送出重設（同檔 `:76`）、重寄驗證信（`actions/auth.ts:92-95`）、變更密碼（`actions/profile.ts:59`）都有。IP 取自 `x-real-ip`／`x-forwarded-for`（`rate-limit.ts:104-111`），Vercel 文件說明它會覆寫 `X-Forwarded-For`、不轉發外部 IP，`x-real-ip` 與它相同，所以在 production 無法偽造。 |
| Low：可判斷 email 是否已註冊 | **已正確修正**（註冊回 409 為已知設計） | 查無帳號或沒有密碼時跑 `verifyAgainstDummyHash`（`src/auth.ts:45-49`、`src/lib/password.ts:25-28`）；申請重設與重寄驗證信的查詢、建 token、寄信都在 `after()` 中執行，並包 try/catch（`actions/password-reset.ts:58-65`、`actions/auth.ts:102-109`）；`verifyEmailToken` 找不到 token 時直接回 `invalid`，不再查帳號狀態（`email-verification.ts:84-86`）。速率限制的鍵與帳號是否存在無關，被擋時的回應也不透露帳號狀態。 |

## Findings

### [Low] 登入與重寄驗證信以「IP + email」為鍵，同一 IP 換 email 就能無限產生新鍵：可以對很多帳號試同一組常見密碼，也可以耗盡 Upstash 免費額度，讓 fail open 關掉所有速率限制

- **位置**：`src/auth.ts:26-29`、`src/actions/auth.ts:92-95`、`src/lib/rate-limit.ts:8-21`、`src/lib/rate-limit.ts:87-96`
- **問題**：`signIn` 與 `resendVerification` 只有 IP + email 的限制，沒有只以 IP 為鍵的總量上限。每換一個 email 就是一個新的鍵，也會向 Upstash 送出一次指令。`checkRateLimit` 在 Upstash 丟出錯誤時放行：

  ```ts
  // src/lib/rate-limit.ts:87-96
  try {
    const { success, remaining, reset, reason } = await limiter.limit(key);
    ...
  } catch (error) {
    console.error(`Rate limit check failed for ${action}; allowing`, error);
    return allowed;
  }
  ```

  `@upstash/ratelimit` 的 `limit()` 不會吞掉 Redis 的錯誤（`node_modules/@upstash/ratelimit/dist/index.mjs:800-814` 只用 `try/finally`），Upstash 免費方案每月 500K 指令，超過後回 `ERR max requests limit exceeded`，錯誤會一路傳到這個 catch。ephemeral cache（同檔 `:760-761`，預設開啟）只擋「已經被限制的同一個鍵」，對新鍵沒有作用。
- **利用情境**：
  1. **噴灑常見密碼**：攻擊者從單一 IP 對一份 email 清單逐一送出 `password123`、`12345678` 等常見密碼，每個 email 每 15 分鐘有 5 次機會、email 數量沒有上限。密碼規則只要求 8 字元，用常見密碼的帳號可能被猜中。
  2. **關掉速率限制**：攻擊者從網頁 JS 取得 `resendVerification` 的 action ID，以腳本送出約 50 萬次帶隨機 email 的請求。每次都是新鍵、都送一次 Upstash 指令；伺服器端只多一次查不到使用者的資料庫查詢，沒有 bcrypt，成本很低。免費額度用完後，當月剩下的時間 `checkRateLimit` 全部放行，登入、申請重設、註冊都回到修正前沒有速率限制的狀態。
- **為什麼 NextAuth 不會處理**：Auth.js 不提供速率限制，鍵的設計與故障時的處理都是應用程式自己的邏輯。
- **修正方式**：在 IP + email 之前先檢查只以 IP 為鍵的寬鬆上限。這樣單一 IP 能產生的新鍵數量有上限，要耗盡額度就需要大量 IP；另外在 Upstash 設定用量通知，或改用 pay-as-you-go 方案。

  ```ts
  // src/lib/rate-limit.ts 的 LIMITS
  signInIp: { tokens: 30, window: "15 m" },
  resendVerificationIp: { tokens: 10, window: "15 m" },

  // src/auth.ts 的 authorize（重寄驗證信同理）
  const ip = getClientIp(request.headers);
  const ipLimit = await checkRateLimit("signInIp", ip);
  const limit = ipLimit.success
    ? await checkRateLimit("signIn", ipEmailKey(ip, email))
    : ipLimit;
  if (!limit.success) {
    throw new RateLimitedError(limit.reset);
  }
  ```

  若要進一步避免額度耗盡後完全失效，可以在 catch 中辨識 `max requests limit exceeded`，只對 `signIn` 改為 fail closed，其餘動作維持放行。
- **備註**：fail open 是「認證端點的速率限制完成」一筆記錄的設計決策（Upstash 故障時不讓所有人都無法登入），「沒有同一 email 跨 IP 的總量限制」也列在同一筆的已知情況（5）。本項是新發現的另外兩點：同一 IP 可以一直換 email，以及額度耗盡會觸發 fail open。

## Passed Checks

**密碼處理**
- ✅ bcryptjs 12 rounds（`src/lib/password.ts:6-10`），比對使用 `compare`（`:12-17`），不自己比較字串
- ✅ 註冊、重設、變更都用 `newPasswordSchema`，以 UTF-8 bytes 限制在 72 bytes 內（`src/lib/auth-schemas.ts:14-24, 35, 52, 66`）
- ✅ `passwordHash` 不外流：`getUserProfile` 只轉成 `hasPassword`（`src/lib/db/users.ts:22-23`）；`authorize` 回傳的物件不含雜湊（`src/auth.ts:59-64`）；`getCurrentUser` 的 select 不含雜湊（`src/lib/current-user.ts:24-30`）；表單元件沒有與雜湊或 userId 有關的欄位
- ✅ 登入時查無帳號或只用 GitHub 的帳號也跑一次 bcrypt，回應時間一致（`src/auth.ts:45-49`）；假雜湊以同樣的成本參數產生（`src/lib/password.ts:25-28`）

**速率限制**
- ✅ 登入限制放在 `authorize`，server action 與直接呼叫 callback 兩條路徑都會經過（`src/auth.ts:25-32`）
- ✅ 送出重設與註冊在解析輸入之前就計數，格式錯誤的請求也算進去（`src/actions/password-reset.ts:74-79`、`src/app/api/auth/register/route.ts:41-51`）
- ✅ 變更密碼以 userId 為鍵，而且在 `getCurrentUser()` 之後，拿到已登入瀏覽器的人不能無限次猜目前的密碼（`src/actions/profile.ts:54-62`）
- ✅ IP 來源在 Vercel 上無法偽造（`src/lib/rate-limit.ts:104-111`，對照 Vercel Request headers 文件的 `x-forwarded-for`／`x-real-ip` 說明）
- ✅ Redis 的鍵中 email 已先做 SHA-256，Redis 裡不存 email 明文（`src/lib/rate-limit.ts:114-119`）

**Email 驗證**
- ✅ token 以 `crypto.randomBytes(32)` 產生，資料庫只存 SHA-256（`src/lib/tokens.ts:4-11`、`src/lib/email-verification.ts:26-37`）
- ✅ 使用時檢查過期（`src/lib/email-verification.ts:88-91`）；消耗 token 與寫入 `emailVerified` 在同一個 transaction，以 `deleteMany` 的 count 保證只能成功一次（`:93-104`）
- ✅ token 綁定 email：查詢條件同時包含 `identifier` 與 token 雜湊（`:79`）
- ✅ 連結網址根取自 `APP_URL`／`VERCEL_PROJECT_PRODUCTION_URL`，不從 Host header 推導（`src/lib/tokens.ts:18-26`）
- ✅ `EmailNotVerifiedError` 只在密碼正確後才丟出（`src/auth.ts:51-57`）；關閉驗證時 `resendVerificationEmail` 直接返回（`src/lib/email-verification.ts:62-64`）

**忘記密碼／重設**
- ✅ 重設 token 使用 `password-reset:` 前綴（`src/lib/password-reset.ts:12, 24-30`）。`emailSchema`（`z.email`）不接受冒號，所以沒有人能註冊與前綴衝突的 email。驗證端點雖然沒有用 schema 驗證 email（`verify-email/route.ts:19`），但必須持有原文 token 才有用，無法利用
- ✅ 使用時檢查過期（`:74-81`）；transaction 內消耗 token 再更新密碼與版本（`:106-127`）；同一 email 重新申請時刪除舊 token（`:48-57`）
- ✅ 只對有 `passwordHash` 的帳號建立 token（`:42-44`），更新時也限定 `passwordHash: { not: null }`（`:115-118`），只用 GitHub 的帳號無法透過重設流程被設定密碼
- ✅ 申請重設不論帳號是否存在都回同一則訊息，查詢與寄信在 `after()` 中執行並已包 try/catch（`src/actions/password-reset.ts:55-67`）
- ✅ 開啟重設頁只讀不消耗 token，已登入者被導走（`src/app/(auth)/reset-password/page.tsx:28-38`）

**Profile**
- ✅ 兩個 action 都在伺服器端以 `getCurrentUser()` 取得使用者，不讀表單中的 userId（`src/actions/profile.ts:54, 132`）；更新與刪除都以 session 的 `id` 為條件（`:86-88`、`:147`）
- ✅ 變更密碼驗證目前密碼（`:76-81`）；成功後刪除未使用的重設 token，並以新密碼替目前裝置重新簽發 token（`:85-98`、`:116-125`）
- ✅ 刪除帳號在伺服器端以 `emailSchema` 正規化後比對（`:137-143`）；內容、帳號與兩種 token 在同一個 transaction 內刪除（`:145-155`、`src/lib/db/user-deletion.ts:13-45`）

**Session 與其他**
- ✅ `sessionVersion` 無法由使用者更新到新版本：`jwt` callback 忽略 `trigger === "update"`（`src/auth.ts:77-91`）；上線前簽發的舊 token 視為 0，不會讓所有人被登出（`src/auth.config.ts:32-33`）
- ✅ `(app)/layout.tsx` 在版本不符或帳號已刪除時導回登入頁（`:13-15`），proxy 只驗簽的限制因此被補上；proxy matcher 涵蓋目前全部登入後的路由（`src/proxy.ts:21-23`）
- ✅ open redirect：`getSafeRedirect` 用 WHATWG URL 解析，只接受同 origin 的路徑（`src/lib/redirect.ts:13-27`），登入 action、GitHub 登入與 `/sign-in` 都使用它
- ✅ 登入錯誤訊息不區分帳號不存在與密碼錯誤（`src/actions/auth.ts:68-76`、`src/app/(auth)/sign-in/page.tsx:24`）
- ✅ 重寄驗證信與申請重設的 `after()` callback 都包了 try/catch，錯誤不會影響已經送出的回應，也不會回傳給使用者（`src/actions/auth.ts:102-109`、`src/actions/password-reset.ts:58-65`）

## 未能確認的項目

- **IPv6 位址輪換**：如果 Vercel 接受 IPv6 連線，擁有一個 /64 網段的攻擊者可以不斷換位址，而 `getClientIp` 以完整位址為鍵，只以 IP 為鍵的限制（註冊、申請重設、送出重設）就會失效。搜尋結果互相矛盾：有第三方文章說 Vercel edge 是 dual-stack，但 Vercel 社群直到 2026 年初仍有要求支援 IPv6 inbound 的討論。所以無法確認，不列為問題。如果確認支援，建議把 IPv6 位址截到 /64 再當作鍵。
- **Upstash 對 sliding window script 的計費方式**：無法確認 `EVALSHA` 算一個還是多個指令。至少算一個，不影響 Low 項目的成立，只影響需要的請求數量。
- **Vercel Hobby 方案的函式用量上限是否會先觸發**：如果 Vercel 的限制先到，專案會先被暫停，額度耗盡的情境就不會發生（但網站也無法使用）。這取決於專案的方案與用量設定，未查證。
