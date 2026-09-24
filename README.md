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
AUTH_SECRET=             # Auth.js 簽 JWT 用，以 npx auth secret 產生
AUTH_GITHUB_ID=          # GitHub OAuth App
AUTH_GITHUB_SECRET=
```

本機的 GitHub OAuth App callback URL 為 `http://localhost:3000/api/auth/callback/github`。

**不要在專案根目錄放 `.env.production`。** Next.js 的 `npm run build`／`start` 會載入它，
且優先於 `.env`，本機 build 就會改連正式資料庫。

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
