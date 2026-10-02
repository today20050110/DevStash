# Item CRUD Architecture

> 為 7 種 item 型別設計一套共用的 CRUD。依據：`context/project-overview.md`（§4.1、§4.3、§6、§8、§9）、`docs/item-types.md`、`prisma/schema.prisma`、`context/coding-standards.md`，以及現有的程式碼模式（`src/actions/profile.ts`、`src/lib/db/items.ts`、`src/app/(app)/`、`src/proxy.ts`）。
> 研究 prompt 列出的 `docs/content-types.md` 與 `src/lib/constants.tsx` 不存在：前者即 `docs/item-types.md`；後者本文建議新建為 `src/lib/item-type-config.ts`（見〈型別專屬邏輯〉）。
> 本文是設計提案，尚未實作。

## 設計原則

1. **一套程式碼服務 7 種型別。** action、查詢、路由各只有一份，差異只出現在元件中依 `kind` 分支的地方。
2. **kind 決定行為，slug 只做微調。** 三種 kind（TEXT / URL / FILE）決定要用哪些欄位、怎麼驗證、怎麼顯示；slug 只用來決定少數細節，例如 snippets 要顯示 language 欄位。之後加入自訂型別時（v1 建議只開放 TEXT），會自動套用對應 kind 的行為，不需要額外寫程式。
3. **kind 由伺服器查出，不採信前端。** 前端只送 `itemTypeId`，action 自己查 ItemType 取得 kind 和 `isProOnly`，再用對應 kind 的 schema 驗證。
4. **每個查詢都帶 `userId`**（§4.3），沿用 `src/lib/db/` 現有的寫法：`userId` 是必填參數，並且放在 `where` 的最後，讓呼叫端傳入的條件無法覆寫它。

## 檔案結構

```
src/
├── actions/
│   └── items.ts                    # 所有 mutation：create / update / delete / toggleFavorite / togglePin
├── lib/
│   ├── db/
│   │   └── items.ts                # 既有檔案，新增：getItemTypeBySlug、getItemsByType、getItemDetail
│   ├── item-schemas.ts             # Zod：依 kind 分成三個 schema
│   ├── item-type-config.ts         # slug → UI 微調（是否顯示 language、placeholder…）
│   ├── tags.ts                     # toTagSlug、標籤 upsert（目前只有 seed 內有一份）
│   └── plan.ts                     # isPro()，開發期 return true（§6）
├── types/
│   └── items.ts                    # 既有檔案，新增 ItemDetail、ItemActionResult
├── app/(app)/
│   └── items/[type]/
│       ├── page.tsx                # 型別列表頁；?item=<id> 時一併渲染 drawer
│       └── loading.tsx             # 骨架屏（§8 微互動）
└── components/items/
    ├── ItemList.tsx                # server：卡片網格／空狀態
    ├── ItemDrawer.tsx              # client：Sheet 外殼，關閉時移除 ?item
    ├── ItemDetail.tsx              # server：標題、metadata、tags、操作按鈕
    ├── ItemContentView.tsx         # 依 kind 分派到下面三個 view
    ├── TextContentView.tsx         # 程式碼（有 language 時）或純文字
    ├── LinkContentView.tsx
    ├── FileContentView.tsx         # 圖片預覽 / 檔案下載，依 mimeType 判斷
    ├── ItemForm.tsx                # client：新增與編輯共用，useActionState
    ├── ItemContentFields.tsx       # 依 kind 分派到 TEXT / URL / FILE 欄位
    ├── TypePicker.tsx              # 新增時選型別；isProOnly 且非 Pro 時停用
    └── DeleteItemDialog.tsx        # alert-dialog（已安裝）
```

**既有元件的處理**：`src/components/dashboard/ItemCard.tsx` 移到 `components/items/` 並改為可點擊，點擊後連到 `?item=<id>`，dashboard 與型別列表頁共用同一個元件。`TypeIcon` 是共用元件，可以留在原位，也可以一起移到 `components/items/`。

## 資料查詢：`src/lib/db/items.ts`

由 server component 直接呼叫，不經過 action。現有的 `findItemSummaries` 已處理 `userId`、`deletedAt`、tag 的擁有者限制和排序，新的列表查詢直接沿用：

```ts
// slug 可能是系統型別或使用者自訂型別；兩者都查，系統型別優先
export async function getItemTypeBySlug(userId: string, slug: string)
  // where: { slug, OR: [{ userId: null, isSystem: true }, { userId }] }

export function getItemsByType(userId: string, itemTypeId: string)
  // findItemSummaries(userId, { where: { itemTypeId }, orderBy: { createdAt: "desc" } })

// drawer 用：包含 content / url / storageKey / mimeType / language / collections
export async function getItemDetail(userId: string, itemId: string): Promise<ItemDetail | null>
  // findFirst({ where: { id: itemId, userId, deletedAt: null } })，查不到回 null
```

- 列表頁使用 `ItemSummary`，不載入 `content`。§9 第 4 題擔心 `content` 太大會拖慢列表查詢，`findItemSummaries` 的 `select` 本來就沒有選 `content`，維持這個做法即可。
- 列表的分頁：系統型別的列表在 v1 規模下可以直接全部載入。等某個型別超過數百筆，再加上 cursor 分頁（以 `createdAt` + `id` 當 cursor，這組鍵已經用在排序上）。

## Mutation：`src/actions/items.ts`

依 coding-standards 使用 Server Actions，沿用 `src/actions/profile.ts` 的寫法：`"use server"`、Zod `safeParse`、`z.flattenError` 轉成欄位錯誤、try/catch、回傳 `{ success, data?, error?, fieldErrors? }`。

| action | 說明 |
| --- | --- |
| `createItem(prev, formData)` | 驗證 → 查 ItemType → 檢查權限與額度 → transaction 內建立 Item + tags（+ collections） |
| `updateItem(prev, formData)` | 先確認 item 屬於目前使用者，再更新；**不允許改型別**（改型別等於換 kind，欄位會互相不一致） |
| `deleteItem(itemId)` | 軟刪除，設定 `deletedAt = now()` |
| `toggleFavorite(itemId)` / `togglePin(itemId)` | 單一欄位的更新。釘選時寫入 `pinnedAt = now()`，取消時設為 null |

**`createItem` 的流程**（對應 §4.1；§4.1 的循序圖畫的是 `POST /api/items`，這裡依 coding-standards 改用 Server Action，日後要給 CLI 或行動 App 使用時再補 API route）：

```
1. getCurrentUser()                         → 查無使用者時回 NOT_SIGNED_IN（沿用 profile.ts）
2. 從 formData 取得 itemTypeId，查 ItemType（系統型別，或 userId 為目前使用者的自訂型別）
3. type.isProOnly && !isPro(user)           → 拒絕
4. itemSchemaForKind(type.kind).safeParse() → 失敗時回 fieldErrors
5. prisma.$transaction:
     a. 額度：FREE 方案且 count({ userId, deletedAt: null }) >= 50 → 拒絕（§6，在 transaction 內檢查）
     b. item.create（只寫入該 kind 用得到的欄位，其餘明確設為 null）
     c. 標籤：toTagSlug 正規化 → 對每個 tag 以 (userId, slug) upsert → 建立 ItemTag
6. revalidatePath("/dashboard")、revalidatePath(`/items/${type.slug}`)
7. 回傳 { success: true, data: { id } }
```

**擁有權檢查**：update 和 delete 一律在 `where` 裡帶 `{ id, userId, deletedAt: null }`。可以用 `updateMany` 並檢查 `count === 0`，或先 `findFirst` 再更新，任一種都可以，**不要**只用 `where: { id }`。這是 §4.3 所說「v1 最容易出、也最傷的 bug」。

**FILE kind**：R2 上傳是建置順序的第 8 步。在那之前，`TypePicker` 先把 files、images 停用，action 遇到 FILE kind 也直接拒絕，不寫半套的上傳流程。等第 8 步再補上 presigned URL 的 API route；這屬於 coding-standards 中「需要上傳進度」的情況，所以用 API route 而不是 Server Action。

## 驗證：`src/lib/item-schemas.ts`

```ts
const baseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

const textSchema = baseSchema.extend({
  content: z.string().min(1).max(CONTENT_MAX_BYTES),  // 上限見「待決定」
  language: z.string().max(30).optional(),
});
const urlSchema  = baseSchema.extend({ url: z.url() });  // 只接受 http(s)
const fileSchema = baseSchema.extend({ storageKey, mimeType, fileSize });  // 第 8 步再補

export function itemSchemaForKind(kind: ItemKind) { ... }
```

- `url` 要限制在 `http:` 和 `https:`。`LinkContentView` 會把它渲染成 `<a href>`，如果允許 `javascript:` 會造成 XSS。
- 依 kind 分成三個 schema，並在寫入時把其他 kind 的欄位明確設為 null，就能補上 `docs/item-types.md` 提到的缺口：「應為 null 的欄位目前沒有任何強制機制」。
- 數字上限（200、1000、20…）是建議的初始值。

## 路由：`/items/[type]`

```
src/app/(app)/items/[type]/page.tsx
```

- **放在 `(app)` route group 裡**，與 dashboard 共用側邊欄和頂部列，layout 也會擋下 session 版本不符的請求。
- **在 `src/proxy.ts` 的 matcher 加入 `"/items/:path*"`**，否則未登入時不會被導向登入頁。
- `params` 在 Next.js 16 是 Promise：`const { type } = await props.params`，props 型別用 `PageProps<"/items/[type]">`（與 `(auth)` 使用的 `LayoutProps` 相同，是 Next.js 自動產生的型別）。
- 流程：
  1. `await connection()`（與 dashboard 相同）
  2. `getItemTypeBySlug(userId, type)`，查不到時 `notFound()`
  3. `getItemsByType(userId, itemType.id)`
  4. 如果有 `searchParams.item`，執行 `getItemDetail(userId, id)` 並渲染 `ItemDrawer`；查不到時不開 drawer
- 側邊欄的連結本來就是 `/items/${type.slug}`，slug 是複數（`/items/snippets`），不需要修改。

### Drawer 用 `?item=<id>` 開啟

| 做法 | 優點 | 缺點 |
| --- | --- | --- |
| **searchParam `?item=<id>`（建議）** | 資料在 server component 中查詢，與現有模式一致；網址可以分享和重新整理；不需要 client 端 fetch | 開關 drawer 都會發出一次伺服器請求 |
| intercepting + parallel routes（`@modal/(.)items/...`） | 開啟時保留列表的 client 狀態 | 需要多個特殊資料夾和 `default.tsx`，dashboard 和型別頁要各設定一次 |
| client 狀態 + action 取資料 | 開啟最快 | 違反「server component 直接查詢」的原則，網址也無法分享 |

選擇 searchParam：`ItemCard` 用 `<Link href="?item=id" scroll={false}>` 開啟 drawer；`ItemDrawer` 是 client 元件，只負責 Sheet 的開關，關閉時執行 `router.replace(pathname)`，內容由 server 端渲染的 `ItemDetail` 以 children 傳入。dashboard 頁面用同樣的做法，就能直接在 dashboard 開啟 item。

### 新增 item

頂部列的「New Item」目前只是外觀。建議做成 client 元件，開啟一個裝著 `ItemForm` 的 Sheet（§8 的 quick-add drawer）。表單需要的型別清單，由 `(app)/layout.tsx` 把 `getSystemItemTypes()` 的結果傳進去。在 `/items/[type]` 頁面開啟時，預設選取該型別；之後在 collection 頁面開啟時，則使用 `Collection.defaultTypeId`。

## 型別專屬邏輯放在哪裡

**放在元件和一份設定檔中，不放在 action。** action 只認得 kind，而且只透過 `itemSchemaForKind` 使用。

```ts
// src/lib/item-type-config.ts —— 只放 UI 微調，不含驗證規則
export const ITEM_TYPE_UI: Record<string, ItemTypeUi> = {
  snippets: { showLanguage: true,  monospace: true,  contentPlaceholder: "Paste code…" },
  commands: { showLanguage: true,  monospace: true,  defaultLanguage: "bash" },
  prompts:  { showLanguage: false, monospace: false, contentPlaceholder: "Write a prompt…" },
  notes:    { showLanguage: false, monospace: false },
};
// 查不到的 slug（自訂型別）退回依 kind 的預設值
export function getItemTypeUi(slug: string, kind: ItemKind): ItemTypeUi
```

| 層 | 依據 | 例子 |
| --- | --- | --- |
| `item-schemas.ts` | kind | TEXT 必須有 content，URL 必須有合法的 http(s) 網址 |
| `actions/items.ts` | kind + `isProOnly` | 只寫入該 kind 的欄位；Pro 專屬型別檢查 `isPro` |
| `ItemContentFields` / `ItemContentView` | kind | TEXT → textarea，URL → url input，FILE → 上傳區 |
| `item-type-config.ts` | slug | snippets、commands 顯示 language 欄位並使用等寬字體 |
| 顏色、圖示 | ItemType 資料列 | 沿用 `getIcon()` 和 inline style 的 color（既有的例外） |

## 元件職責

| 元件 | 類型 | 職責 |
| --- | --- | --- |
| `ItemList` | server | 接收 `ItemSummary[]`，渲染卡片網格；沒有資料時顯示空狀態和「New {type}」按鈕 |
| `ItemCard` | server | 既有元件，改為連到 `?item=<id>` 的 Link；只顯示摘要，不顯示 content |
| `ItemDrawer` | client | Sheet 的開關、關閉時更新網址、在手機上全螢幕顯示 |
| `ItemDetail` | server | 標題、型別、tags、collections、日期；提供編輯、刪除、釘選、收藏的操作 |
| `ItemContentView` | server | 依 kind 分派到 `TextContentView` / `LinkContentView` / `FileContentView` |
| `TextContentView` | server | 有 `language` 時以等寬字體的程式碼區塊顯示並附複製按鈕（複製按鈕是 client 子元件），否則以一般文字顯示。語法高亮套件尚未選定（見「待決定」） |
| `LinkContentView` | server | 顯示網域，`target="_blank" rel="noopener noreferrer"` |
| `FileContentView` | server | `mimeType` 為 `image/*` 時顯示預覽，否則顯示下載連結，網址都在讀取時才簽發（第 8 步） |
| `ItemForm` | client | 新增與編輯共用；`useActionState(createItem / updateItem)`；欄位錯誤顯示在頁面上，沿用 `FormField` 和 `FormMessage` |
| `ItemContentFields` | client | 依 kind 分派輸入欄位；TEXT 依 `getItemTypeUi` 決定是否顯示 language |
| `TypePicker` | client | 只在新增時出現；Pro 專屬型別顯示 PRO 並停用（與側邊欄的 `ProBadge` 一致） |
| `DeleteItemDialog` | client | 確認後呼叫 `deleteItem`，成功時關閉 drawer。沿用 `DeleteAccountDialog` 的經驗：不要用 `AlertDialogAction`，因為它一點擊就會關閉對話框，伺服器回傳的錯誤會看不到 |

## 建議的實作切分

這次變動範圍很大，建議分成三個 feature，各自走一次 spec → branch → commit：

1. **讀取**：`/items/[type]` 列表、proxy matcher、`getItemTypeBySlug`、`getItemsByType`、`getItemDetail`、drawer 的檢視模式。完成後側邊欄的連結就不再 404。
2. **新增與編輯**：`item-schemas.ts`、`createItem`、`updateItem`、`ItemForm`、頂部列的 New Item、標籤 upsert（建立 `lib/tags.ts`，之後 seed 也可以改用它）。
3. **刪除與快速操作**：`deleteItem`、`toggleFavorite`、`togglePin`、`DeleteItemDialog`。

FILE kind（files、images）要等到 R2 那一步（第 8 步）。在那之前，這兩種型別的列表頁可以正常顯示，但無法新增。

## 待決定

1. **`content` 大小上限**（§9 第 4 題）：建議 Free 100KB、Pro 1MB，在 Zod 中以 UTF-8 bytes 計算，做法與密碼的 72 bytes 檢查相同。
2. **quick-add 的快捷鍵**（§9 第 1 題）：頂部列的 ⌘K 標示目前寫在搜尋框上。
3. **語法高亮**：Shiki（在 server 端渲染，不增加 client bundle，但 server 端較重），或先只用等寬字體、不做高亮。建議第 1 個 feature 先不做高亮。
4. **軟刪除後是否提供「最近刪除」與還原**：schema 已經支援。v1 可以先只刪除不還原，等 sweeper 的保留期（§9 第 2 題，建議 30 天）確定後再決定。
5. **表單中是否可以選擇 collections**：`ItemCollection` 已經存在，但 Collection CRUD 是第 5 步。建議表單先不放這個欄位。
6. **成功時的提示**：coding-standards 寫的是 toast，但目前專案沒有安裝 sonner，auth 和 profile 頁面都把訊息直接顯示在頁面上。CRUD 有很多操作會成功後關閉 drawer，畫面上沒有地方顯示訊息，這是值得加入 toast 的時機。
