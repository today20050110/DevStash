# Auth Security Review

- **最後稽核日期**：2026-09-30
- **稽核範圍**（master，`76d3d55`）：
  - 設定：`src/auth.ts`、`src/auth.config.ts`、`src/proxy.ts`
  - Server Actions：`src/actions/auth.ts`、`src/actions/password-reset.ts`、`src/actions/profile.ts`
  - API routes：`src/app/api/auth/register/route.ts`、`src/app/api/auth/verify-email/route.ts`
  - 函式庫：`src/lib/auth-schemas.ts`、`src/lib/password.ts`、`src/lib/tokens.ts`、`src/lib/email.ts`、`src/lib/email-verification.ts`、`src/lib/password-reset.ts`、`src/lib/redirect.ts`、`src/lib/current-user.ts`、`src/lib/search-params.ts`、`src/lib/db/users.ts`、`src/lib/db/user-deletion.ts`、`src/types/user.ts`
  - 頁面與元件：`src/app/(auth)/sign-in/page.tsx`、`src/app/(auth)/forgot-password/page.tsx`、`src/app/(auth)/reset-password/page.tsx`、`src/app/(app)/layout.tsx`、`src/app/(app)/dashboard/page.tsx`、`src/app/(app)/profile/page.tsx`、`src/components/auth/SignInForm.tsx`、`src/components/auth/ResetPasswordForm.tsx`、`src/components/profile/DeleteAccountDialog.tsx`
  - 資料模型：`prisma/schema.prisma`（`User`、`Account`、`Session`、`VerificationToken`）
  - 查證用：`node_modules/@auth/core/lib/init.js`（session 預設值）、`node_modules/next-auth/lib/index.js`（proxy 回寫 session cookie）
- **結果摘要**：Critical 0／High 0／Medium 2／Low 1

## Findings

### [Medium] 驗證關閉時可預先註冊他人 email，受害者重設密碼後攻擊者的 session 仍然有效（已知情況的組合）

- **位置**：
  - `src/auth.ts:42`（只有 `isEmailVerificationEnabled()` 為 true 才擋未驗證帳號；production 目前關閉）
  - `src/lib/password-reset.ts:114-124`（重設密碼只改 `passwordHash`、補 `emailVerified`，不讓既有 session 失效）
  - `src/actions/profile.ts:77-85`（變更密碼同樣不讓其他 session 失效）
  - `src/lib/current-user.ts:21-24`（回查資料庫只確認帳號還在，不確認 session 是否在改密碼之前簽發）
- **問題**：驗證關閉時，任何人都能用別人的 email 註冊並立刻登入。JWT session 無法撤銷，而且 proxy 每次請求都會回寫 cookie（`node_modules/next-auth/lib/index.js:181-184`；`updateAge` 24 小時、閒置 30 天才過期，`node_modules/@auth/core/lib/init.js:38,76`），所以只要攻擊者持續造訪，session 就一直有效。信箱主人之後透過忘記密碼取回帳號時，攻擊者的 session 不會失效。
  ```ts
  // src/lib/password-reset.ts:114-124
  const updated = await tx.user.updateMany({
    where: { email, passwordHash: { not: null } },
    data: { passwordHash },
  });
  ...
  await tx.user.updateMany({
    where: { email, emailVerified: null },
    data: { emailVerified: new Date() },
  });
  ```
- **利用情境**：
  1. 攻擊者以 `victim@gmail.com` 呼叫 `POST /api/auth/register`（production 驗證關閉，不寄信），以自訂的密碼登入後保留 session cookie。
  2. 受害者之後想註冊，拿到 409「An account with this email already exists」，於是走 `/forgot-password`，收信後重設密碼。這時 `emailVerified` 也被補上，帳號看起來完全正常。
  3. 受害者開始在 DevStash 存 snippet、prompt、筆記。攻擊者手上的 JWT 依然能通過 proxy，`getCurrentUser()` 也只檢查 `User.id` 是否存在，所以攻擊者能持續讀取並修改受害者的所有資料（日後的 item CRUD 也一樣），也能從 `/profile` 刪除帳號。刪除帳號只要求輸入 email，不需要密碼。
- **為什麼 NextAuth 不會處理**：JWT strategy 不在伺服器保存 session，Auth.js 沒有「密碼變更後讓舊 token 失效」的機制，必須由應用程式在 token 裡帶版本號並自行比對。
- **修正方式**：在 `User` 加上 session 版本號，登入時寫進 JWT，`getCurrentUser()` 回查時一併比對；重設密碼與變更密碼時遞增版本號。`getCurrentUser()` 本來就會查資料庫，所以不會多一次查詢。
  ```prisma
  model User {
    // ...
    sessionVersion Int @default(0)
  }
  ```
  ```ts
  // src/auth.config.ts（不 import Prisma，proxy 也能用）
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sessionVersion = user.sessionVersion ?? 0; // authorize 與 adapter 的 user 都要帶這個欄位
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.sessionVersion = token.sessionVersion as number;
      return session;
    },
  },

  // src/lib/current-user.ts
  return prisma.user.findFirst({
    where: { id: userId, sessionVersion: session.user.sessionVersion },
    select: { id: true, name: true, email: true, image: true },
  });

  // src/lib/password-reset.ts 與 src/actions/profile.ts 更新密碼時
  data: { passwordHash, sessionVersion: { increment: 1 } },
  ```
  變更密碼後，目前這台裝置也會被登出。如果要讓它繼續登入，可以在 action 成功後重新 `signIn`，或直接提示使用者重新登入。另外 proxy 仍然只驗簽，被撤銷的 session 會通過 proxy，但頁面拿到的是 `null`，行為和現在「帳號已刪除」的情況一樣。
- **備註**：這一項由 History 裡三條已知情況組合而成，組合後的攻擊路徑沒有被記錄：
  - 「註冊時的電子郵件驗證完成」已知（3）：「可先以他人 email 註冊，信箱主人誤點驗證信後攻擊者即可登入」
  - 「Email 驗證開關完成」已知（1）：「推送後正式網站的驗證為關閉，任何 email 註冊後都能直接登入」
  - 「忘記密碼完成」已知（2）與「Profile 頁面完成」已知（1）：JWT session 無法撤銷

  原本的紀錄只寫到「攻擊者能登入一個空帳號」，沒有寫到受害者用重設密碼「取回」帳號後，攻擊者仍能讀到受害者之後存入的資料。

### [Medium] 登入、註冊、忘記密碼、重寄驗證信、變更密碼都沒有速率限制（已知）

- **位置**：
  - `src/auth.ts:16-44`（`authorize`）
  - `src/actions/auth.ts:31-49`（`signInWithCredentials`）、`src/actions/auth.ts:73-94`（`resendVerification`）
  - `src/actions/password-reset.ts:33-51`（`requestPasswordResetAction`）
  - `src/app/api/auth/register/route.ts:34`
  - `src/actions/profile.ts:33`（`changePasswordAction`）
- **問題**：這些入口都沒有節流，也沒有依帳號計算的失敗次數或鎖定。唯一的成本是 bcrypt 12 rounds。
- **利用情境**：
  1. 攻擊者對已知 email 平行送出大量登入請求（`/api/auth/callback/credentials` 或登入的 Server Action），用常見密碼字典線上猜測。serverless 會自動擴展，bcrypt 的成本只會增加帳單，擋不住猜測。
  2. 攻擊者對受害者的 email 反覆呼叫 `requestPasswordResetAction`。每次都會寄出一封重設信，這個行為不受 `EMAIL_VERIFICATION_ENABLED` 控制（`src/lib/password-reset.ts:37-66`），可以灌爆受害者的信箱，也會耗掉 Resend 的額度。目前 `onboarding@resend.dev` 只能寄給帳號本人，所以實際轟炸對象暫時只有站主本人。這個緩解條件會在驗證自有網域後消失。
- **為什麼 NextAuth 不會處理**：Auth.js 不提供速率限制或帳號鎖定，Credentials provider 的文件明確說這部分要由應用程式負責。
- **修正方式**：引入跨請求的計數器，依 IP 與 email 兩個維度計數，例如 Upstash Ratelimit：
  ```ts
  const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "15 m") });
  const { success } = await limiter.limit(`signin:${email}`);
  if (!success) return { success: false, error: "Too many attempts, try again later" };
  ```
  申請重設與重寄驗證信可以另外做每個 email 的冷卻，例如 60 秒內不重寄。這可以用現有 `VerificationToken` 的 `expires` 推回建立時間來判斷，不需要 Redis。
- **備註**：History「Auth Phase 2 完成」已知：「登入與註冊無速率限制（§3.4 延後 Redis）」；「註冊時的電子郵件驗證完成」已知（5）：「重寄無速率限制」；「忘記密碼完成」已知（3）：「申請重設無速率限制」。

### [Low] 從回應時間與驗證端點可以判斷 email 是否已註冊（與已知的 409 重疊）

- **位置**：
  - `src/auth.ts:34-41`：查無使用者時直接 `return null`，不做 bcrypt，比密碼錯誤快約一次 bcrypt 12 rounds（數百毫秒）
  - `src/lib/password-reset.ts:42-66`：有密碼的帳號會多跑一個 transaction，並 `await` 一次 Resend HTTP 呼叫，明顯較慢
  - `src/lib/email-verification.ts:82-88`：`GET /api/auth/verify-email?email=X&token=任意值` 在帳號已驗證時導向 `?verified=1`，否則導向 `?error=VerificationInvalid`
- **問題**：畫面文案都刻意不透露帳號是否存在，但時間差和導向結果仍然會透露。
- **利用情境**：攻擊者對一串 email 送出登入請求，每次用錯的密碼，依回應時間把 email 分成「已註冊的帳密帳號」和「不存在或只用 GitHub 的帳號」。對 `/api/auth/verify-email` 送任意 token，則可以直接看出某個 email 是否已註冊且已驗證。
- **為什麼 NextAuth 不會處理**：`authorize` 完全由應用程式實作，Auth.js 不會補上等時比對；驗證端點也是自訂的 route。
- **修正方式**：
  ```ts
  // src/auth.ts：查無使用者時仍比對一次固定的假雜湊，讓兩條路徑耗時相近
  const DUMMY_HASH = "$2b$12$..."; // 預先以 hashPassword 產生
  if (!user?.passwordHash) {
    await verifyPassword(password, DUMMY_HASH);
    return null;
  }

  // src/lib/password-reset.ts：寄信改在回應之後執行
  import { after } from "next/server";
  after(() => sendPasswordResetEmail(email, url.toString(), TOKEN_TTL_MINUTES).catch(console.error));
  ```
  驗證端點找不到 token 時，一律回 `VerificationInvalid`，或者只在 email 與 token 格式都正確時才查 `emailVerified`。
- **備註**：`POST /api/auth/register` 回 409 本來就會直接透露 email 已註冊。這是 History「Auth Phase 2 完成」記錄的已知情況，也是使用者確認過的設計。在這個前提下，本項只是多出幾個列舉途徑，所以列為 Low。

## Passed Checks

**密碼處理**
- ✅ 密碼以 bcryptjs 12 rounds 雜湊（`src/lib/password.ts:4-8`），比對使用函式庫的 `compare`（`src/lib/password.ts:14`），沒有自己比對字串。
- ✅ 所有設定密碼的入口都共用 `newPasswordSchema`，以 UTF-8 bytes 限制在 72 bytes 以內（`src/lib/auth-schemas.ts:14-24`），套用在註冊（`:35`）、重設（`:52`）、變更（`:66`）。
- ✅ `passwordHash` 不會流到 client：`getUserProfile` 只把它轉成 `hasPassword`（`src/lib/db/users.ts:22-23`），`getCurrentUser` 的 select 不含它（`src/lib/current-user.ts:23`），註冊 API 的回應只 select `id`／`name`／`email`（`src/app/api/auth/register/route.ts:61`），`authorize` 回傳給 Auth.js 的物件也不含雜湊（`src/auth.ts:46-51`）。
- ✅ 找不到任何把密碼或雜湊寫進 log 的地方，所有 `console.error` 都只記錄錯誤物件。

**Email 驗證**
- ✅ token 以 `crypto.randomBytes(32)` 產生（`src/lib/tokens.ts:5`），資料庫只存 SHA-256（`src/lib/tokens.ts:9-11`、`src/lib/email-verification.ts:33`）。
- ✅ 在使用當下檢查有效期限（`src/lib/email-verification.ts:91`），不是只在寄信時設定。
- ✅ 在 transaction 內以 `deleteMany` 的 count 確保只能用一次，消耗 token 與寫入 `emailVerified` 在同一個 transaction（`src/lib/email-verification.ts:96-107`）。
- ✅ token 以 `identifier = email` 綁定，查詢條件同時包含 email 與 token 雜湊（`src/lib/email-verification.ts:79`），不能拿 A 的 token 驗證 B。
- ✅ 連結的網址根只取自 `APP_URL`／`VERCEL_PROJECT_PRODUCTION_URL`，不從 Host header 推導（`src/lib/tokens.ts:18-26`）。
- ✅ 驗證開關集中在 `isEmailVerificationEnabled()`（`src/lib/email-verification.ts:21-23`），`authorize` 在密碼驗證通過之後才丟出 `EmailNotVerifiedError`（`src/auth.ts:38-44`），不知道密碼的人無從得知帳號的驗證狀態。

**忘記密碼／重設**
- ✅ 重設 token 同樣使用 32 bytes CSPRNG 並只存 SHA-256，有效期 1 小時（`src/lib/password-reset.ts:6, 46-56`）。重設時先檢查過期（`:94-102`），再在 transaction 內消耗 token 並更新密碼（`:106-126`），同時送出兩次只會成功一次。
- ✅ 重設 token 與驗證 token 不能互換：重設 token 的 identifier 是 `password-reset:{email}`（`src/lib/password-reset.ts:12, 24-30`），驗證 token 的 identifier 是純 email。`emailSchema` 使用 `z.email()`，不接受含冒號的位址，所以不可能註冊出 `password-reset:…` 形式的帳號。
- ✅ 只寄重設信給有 `passwordHash` 的帳號（`src/lib/password-reset.ts:42-44`），更新時也限定 `passwordHash: { not: null }`（`:115`），只用 GitHub 登入的帳號無法經由重設被設定密碼。
- ✅ 同一 email 重新申請時，會在 transaction 內先刪除舊 token（`src/lib/password-reset.ts:48-57`）。變更密碼時一併刪除未使用的重設 token（`src/actions/profile.ts:82-84`）。
- ✅ 申請重設的畫面訊息不論帳號是否存在都相同（`src/actions/password-reset.ts:29-30, 49-50`）。時間差見 Low 項。
- ✅ `/reset-password` 頁面只讀取 token 的狀態，不消耗它（`src/app/(auth)/reset-password/page.tsx:37-38`）。

**Profile**
- ✅ `changePasswordAction` 與 `deleteAccountAction` 都在伺服器端以 `getCurrentUser()` 取得使用者（`src/actions/profile.ts:51, 98`），不讀表單傳來的 userId。更新與刪除都以 session 的 `id` 為條件（`:79`、`:113`）。
- ✅ 變更密碼會以 bcrypt 驗證目前密碼（`src/actions/profile.ts:68-73`）。
- ✅ 刪除確認在伺服器端再檢查一次，比對前先用 `emailSchema` 正規化（`src/actions/profile.ts:103-109`）；前端的 `disabled` 只是 UX（`src/components/profile/DeleteAccountDialog.tsx:81`）。
- ✅ 刪除帳號在單一 transaction 內完成：內容、User（Account／Session 經 cascade 刪除），以及兩種 token（`src/actions/profile.ts:111-121`、`src/lib/db/user-deletion.ts:13-45`）。刪除後舊 JWT 的 `sub` 查不到使用者，而新註冊的帳號會拿到新的 cuid，所以舊 session 不會對應到新帳號。

**其他**
- ✅ `getSafeRedirect` 以 WHATWG `URL` 解析後，確認 origin 沒有改變（`src/lib/redirect.ts:13-27`）。登入 action、GitHub 登入、`/sign-in` 已登入時的導向都經過它（`src/actions/auth.ts:47, 98`、`src/app/(auth)/sign-in/page.tsx:70-74`）。其他 redirect 的目標都是寫死的站內路徑。
- ✅ 登入錯誤不區分帳號不存在和密碼錯誤（`src/auth.ts:34-41`、`src/actions/auth.ts:58-66`）。
- ✅ 需要登入的頁面都經過 proxy（`src/proxy.ts:21-23` 涵蓋 `/dashboard`、`/profile`），頁面本身也以 `getCurrentUserId()` 回查資料庫（`src/app/(app)/dashboard/page.tsx:39`、`src/app/(app)/profile/page.tsx:30-46`），帳號刪除後的舊 token 拿不到資料。
- ✅ 註冊時不會替已存在的帳號（包括 GitHub 建立的帳號）補上密碼，查詢與建立之間的競態由 unique constraint 擋下（`src/app/api/auth/register/route.ts:50-56, 76-81`）。沒有設定 `allowDangerousEmailAccountLinking`（`src/auth.config.ts:21-24`）。

## 未能確認的項目

- **Auth.js 的 `/api/auth/callback/credentials` 端點**：Auth.js 本身也會暴露這個端點，可以不經過 Server Action 直接登入。它最後同樣呼叫 `src/auth.ts` 的 `authorize`，所以驗證邏輯一致，速率限制的問題也一樣（已併入上方 Medium 項）。本次沒有實際以 HTTP 請求驗證這個端點的行為。
- **同時申請兩次重設**：兩個 `requestPasswordReset` 同時執行時，在 read committed 隔離下有可能都完成「刪除後建立」，留下兩個有效 token；重設成功時只會刪除用掉的那一個（`src/lib/password-reset.ts:108-110`）。兩個 token 都只寄到信箱主人手上，找不到可利用的情境，所以不列為問題。
