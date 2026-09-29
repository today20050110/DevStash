# DevStash

開發者零散資產（程式碼片段、AI prompt、指令、連結、筆記、檔案）的單一中樞。

Next.js 16 / React 19 / TypeScript · Neon Postgres + Prisma 7 · Tailwind CSS v4 + shadcn/ui

## 前置需求

- Node.js 20+
- 一個 Neon Postgres 專案（或任何 Postgres，需支援 `pg_trgm`）

## 設定

`.env`（已 gitignore，不要提交）需要這些鍵：

```
DATABASE_URL=            # pooled 連線字串，應用程式執行期使用
DATABASE_URL_UNPOOLED=   # 直連字串，migration 與 seed 使用
NEON_BRANCH=             # 選用，只供 npm run test:db 顯示用
AUTH_SECRET=             # Auth.js 簽 JWT 用，產生方式見下方
AUTH_GITHUB_ID=          # GitHub OAuth App
AUTH_GITHUB_SECRET=
EMAIL_VERIFICATION_ENABLED=  # 設為 true 才要求 email 驗證，見下方
RESEND_API_KEY=          # 寄送註冊驗證信（Resend），關閉驗證時可不設
APP_URL=                 # 選用，驗證信連結的網址根，見下方
UPSTASH_REDIS_REST_URL=  # 選用，速率限制用的 Upstash Redis，見下方
UPSTASH_REDIS_REST_TOKEN=
```

產生 `AUTH_SECRET`（不要用 `npx auth secret`，它可能寫出 `.env.local`，蓋過 `.env`）：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

本機的 GitHub OAuth App callback URL 為 `http://localhost:3000/api/auth/callback/github`。
production 要另建一個 OAuth App，callback 指向正式網域，`AUTH_SECRET` 也另外產生，不與本機共用。

email 驗證預設關閉：`EMAIL_VERIFICATION_ENABLED` 不是 `true` 時不寄驗證信，帳號密碼註冊後即可登入。
關閉期間註冊的帳號 `emailVerified` 維持空值，日後開啟驗證時需先從登入頁重寄驗證信才能登入。
在 Vercel 修改這個變數後須 Redeploy 才會生效。

開啟時，以帳號密碼註冊後須點擊驗證信中的連結才能登入（GitHub 登入不需要）。寄件地址是
`onboarding@resend.dev`：在 Resend 驗證自有網域之前，**只能寄給 Resend 帳號本人的 email**，
寄給其他地址時帳號仍會建立，但登入頁會提示驗證信寄送失敗。這類信件常被 Gmail 分到垃圾郵件。

忘記密碼（`/forgot-password`）不受 `EMAIL_VERIFICATION_ENABLED` 影響，一律可用，但同樣受上述寄件限制：
寄給其他地址時信件寄不出去，而畫面為了不透露 email 是否已註冊，仍顯示同一則訊息，失敗只記在 server log。
重設連結有效 1 小時、只能使用一次；只有以帳號密碼註冊的帳號會收到信。

驗證信與重設信連結的網址根依序取 `APP_URL` → Vercel 自動提供的 `VERCEL_PROJECT_PRODUCTION_URL`
→ `http://localhost:3000`，不從請求的 Host header 推導（可被偽造而把 token 送到別的網域）。
本機與 Vercel production 通常不需要設定 `APP_URL`；Preview 部署的連結會指向正式網域。

登入、註冊、忘記密碼、重設密碼、重寄驗證信與變更密碼有速率限制（`src/lib/rate-limit.ts`，
Upstash Redis）。連線資訊依序讀 `KV_REST_API_URL`／`KV_REST_API_TOKEN` →
`UPSTASH_REDIS_REST_URL`／`UPSTASH_REDIS_REST_TOKEN`：

| 環境 | 變數 | 資料庫 |
| --- | --- | --- |
| Production、Preview | `KV_REST_API_*`（Vercel 的 Upstash 整合自動設定） | `devstash-ratelimit` |
| Development | `UPSTASH_REDIS_REST_*`（Vercel 的 Development 環境變數） | 另一個 Upstash 資料庫 |

兩者分開，本機測試不會鎖住正式網站的使用者。**本機不設定也可以**：沒有設定、連不上或逾時（1 秒）
時一律放行並記錄 log（fail open）。要在本機測試速率限制，把 Development 的兩個值帶進
`npm run dev` 的程序環境即可；不要用 `vercel env pull` 的預設路徑，它會建立 `.env.local`。

根目錄的 `.env.production`（已 gitignore）放 production 的連線字串與 Auth 變數。
Next.js 只在 `npm run build`／`start` 載入它，且優先於 `.env`，所以各指令連到的資料庫不同：

| 指令 | 資料庫 |
| --- | --- |
| `npm run dev` | Development（`.env`） |
| `npm run build`／`npm run start` | **production**（`.env.production`） |
| Prisma CLI、`npm run test:db` | Development（`dotenv` 只讀 `.env`） |

本機 `start` 起來的網站會讀寫正式資料庫；其 GitHub 登入使用 production 的 OAuth App，
callback 指向正式網域，在 localhost 上會失敗。

`DATABASE_URL_UNPOOLED` 不能省 —— `prisma.config.ts` 以 `env()` 讀取，缺值會直接
拋 `PrismaConfigEnvError`。連線字串不要加引號。

## 啟動

```bash
npm install
npx prisma migrate deploy   # 套用 migration
npx prisma db seed          # 寫入 7 種系統型別
npm run dev                 # http://localhost:3000
```

想要一份可瀏覽的範例資料（demo 帳號、5 個 collection、18 筆 item）：

```bash
SEED_DEMO=1 npx prisma db seed
```

**不要對 production 設 `SEED_DEMO`** —— demo 帳號的密碼是明碼寫在 seed 裡的。
seed 可重複執行；帶 `SEED_DEMO=1` 重跑會清掉並重建 demo 帳號底下的所有內容。

## 指令

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發伺服器 |
| `npm run build` | production build |
| `npm run start` | production 伺服器 |
| `npm run lint` | ESLint |
| `npm run test:db` | 唯讀檢查連線、migration、`pg_trgm`、系統型別、資料列數 |
| `npm run db:studio` | Prisma Studio |

## Migration 紀律

- 本機獨立資料庫（Docker 或 Neon 分支）：`db push` 可用於探索
- 任何會被別人或 CI 讀到的資料庫：一律 `prisma migrate dev` 產生 migration 檔
- 部署：`prisma migrate deploy`，永不 `migrate dev`
- 需要手寫 SQL（partial index、generated column）時：`prisma migrate dev --create-only`

Prisma 7 起產生的 client 放在 `src/generated/`（已 gitignore）而非 `node_modules`，
所以 clone 之後第一次要先跑 `npx prisma generate`（`npm install` 的 postinstall
不會做這件事）。

## 文件

`context/` 是這個專案的事實來源：

- `context/project-overview.md` — 產品定位、資料模型決策、技術選型的理由
- `context/coding-standards.md` — TypeScript／React／Next.js／Tailwind 的慣例
- `context/ai-interaction.md` — 開發流程與 commit 規範
- `context/current-feature.md` — 進行中的功能與完整的變更歷史
