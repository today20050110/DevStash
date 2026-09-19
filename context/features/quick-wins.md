# Quick Wins

來源：2026-09-20 兩次程式碼掃描中風險極低、可一次清掉的項目。

篩選標準：改動小、行為變化可預期或為零、不需要 migration、不動資料模型、
不動任何元件的 props 介面。

## Requirements

### Q1 — Prisma 連線池加上 fail-fast 與合理上限

`src/lib/prisma.ts:12-13`

目前只傳連線字串給 `PrismaPg`，其餘吃 `pg-pool` 預設值（已讀
`node_modules/pg-pool/index.js` 確認）：`max = 10`、`idleTimeoutMillis = 10000`、
而 `connectionTimeoutMillis` 未設時第 206 行 `if (!this.options.connectionTimeoutMillis)`
直接不掛計時器 —— **取連線可以無限期等待**。

Neon 冷啟動或 pooler 短暫不可用時，請求會卡到 Vercel 函式逾時，錯誤訊息是平台的
timeout 而不是資料庫的原因，難以診斷。

```ts
new PrismaPg({
  connectionString,
  // serverless：一個請求最多 5～6 個查詢且多半 Promise.all，不需要 pg 預設的 10
  max: 5,
  // 預設不掛計時器等同無限等待，Neon 冷啟動時請求會卡到函式被殺
  connectionTimeoutMillis: 10_000,
})
```

### Q2 — `getPinnedItems` 補上限

`src/lib/db/items.ts:124-129`

`findItemSummaries` 只在收到 `take` 時才加上限，`getPinnedItems` 沒傳。釘選數量沒有
保證，Pro 方案項目無上限；同檔案的 `getRecentItems` 有 `RECENT_ITEMS_LIMIT = 10`，
兩者待遇不一致。

比照鄰近寫法加具名常數與預設參數：

```ts
const PINNED_ITEMS_LIMIT = 10;

export function getPinnedItems(
  userId: string,
  limit = PINNED_ITEMS_LIMIT,
): Promise<ItemSummary[]> {
  return findItemSummaries(userId, {
    where: { pinnedAt: { not: null } },
    orderBy: { pinnedAt: "desc" },
    take: limit,
  });
}
```

demo 只有 3 筆釘選，畫面不會有變化。

### Q3 — `ItemCard` 的透明度不再靠字串相接

`src/components/dashboard/ItemCard.tsx:24-25`

```tsx
// 1a is ~10% alpha on the type's six-digit hex colour.
style={{ backgroundColor: `${color}1a`, color }}
```

`ItemType.color` 在 schema 裡只是 `String`，沒有格式約束。目前 7 種系統型別都是
6 碼 hex 才能用；換成 `#fff`、`rgb(...)` 或具名色就會產出無效值，背景靜默消失。

```tsx
style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`, color }}
```

註解裡「six-digit hex」那條假設一併移除。改完視覺應與現況無法區分。

### Q4 — `use-mobile` 不再每次都建 `MediaQueryList`

`src/hooks/use-mobile.ts:9-17`

`subscribe` 與 `getSnapshot` 各自呼叫 `window.matchMedia(QUERY)`。
`useSyncExternalStore` 每次 render 與每次通知都會呼叫 `getSnapshot`，等於每次都付
一次 `matchMedia()` 的成本。回傳值是 boolean，識別性穩定，**沒有正確性問題**，
純粹是多餘的分配。

模組層 lazy 建一次並共用：

```ts
let mql: MediaQueryList | undefined;
const getMql = () => (mql ??= window.matchMedia(QUERY));
```

檔案開頭那段「Rewritten from the shadcn default…」的註解要保留 —— History 記錄過
日後 `shadcn add` 可能覆蓋這個檔案。

### Q5 — 移除未被引用的 `@neon/env`

`package.json`

全專案 grep 零引用（`neon.ts` 用的是 `@neon/config/v1`）。`npm uninstall @neon/env`。

### Q6 — README 換掉 create-next-app 樣板

`README.md:1-36`

目前指向 `app/page.tsx`（本專案是 `src/app/`）、列出 yarn/pnpm/bun（本專案是
npm + package-lock），沒提 `.env.local` 需要哪些變數、`npm run test:db`、或
migration 紀律。對第一次 clone 的人是錯誤資訊。

縮成十幾行：前置需求 → `.env.local` 需要的鍵（只寫鍵名，不寫值）→
`npm install` → `npx prisma migrate deploy` → `npx prisma db seed`
（註明 demo 資料需 `SEED_DEMO=1`）→ `npm run dev`，其餘指向 `context/`。

## 明確不做

- **collection 查詢的關聯過度載入與重複查詢** —— 已有獨立 spec
  `context/features/collection-query-perf.md`，牽涉 `$queryRaw` 與三個 export 的
  重構，不屬於低風險，不併入本批
- **系統型別 slug／demo 帳號的重複常數** —— 要動 `seed.ts`、`test-db.ts`、
  `db/items.ts` 三個檔案並影響側邊欄排序，另開
- **`AppSidebar.tsx` 拆檔** —— 純搬移但範圍大，且會與 collection 查詢那份動到
  同一條資料路徑，排在它之後
- **`seed.ts` 的 `buildPinnedAt` 以 title 當鍵** —— 要重跑 seed 驗證，不是零風險
- **`src/lib/utils.ts` 的 `cn` 與元件直接 `import from "cn"` 並存** —— 統一任一邊
  都要動 10 個 shadcn 產生的檔案，或與 `components.json` 的 alias 不一致，
  收益不抵風險
- **`.env.production`** —— 涉及真實憑證的保管方式與 `.claude/skills/cleanup`
  的假設，是操作決定不是程式碼改動，單獨處理
- 任何 migration 或 schema 改動

## 驗證方式

- Q1：`npm run build` 與 `npm run dev` 皆能正常連線；設一個不存在的 host 確認
  10 秒內失敗而非無限等待
- Q2：dashboard 的 Pinned 區塊仍是 3 筆、順序不變
- Q3：型別圖示方塊的背景色與改動前以截圖比對無法區分
- Q4：桌面、390px 手機、以及跨越 768px 斷點拖曳視窗，側邊欄行為不變
- Q5：`npm run build` 通過，`neon.ts` 不受影響
- Q6：README 中的每一條指令實際跑過
- 全部：`tsc --noEmit`、`npm run lint`、`npm run build`、`npm run test:db`
