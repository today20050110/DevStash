# Item Types

> 7 種系統型別的整理，資料來源：`prisma/schema.prisma`、`prisma/seed.ts`、`src/lib/icons.ts`、`src/lib/db/items.ts`、`context/project-overview.md`（§2、§3.3、§6、§8）。
> 研究 prompt 列出的 `src/lib/constants.tsx` 不存在；型別定義的唯一來源是 `prisma/seed.ts` 的 `SYSTEM_ITEM_TYPES`，寫入資料庫後由 `getSystemItemTypes()` 讀出。

## 命名慣例

型別的 `name` 與 `slug` 皆為**複數**（`Snippets` / `snippets`），對齊側邊欄連結 `/items/[slug]`（例如 `/items/snippets`）。本文以單數稱呼型別概念，指涉資料時用 slug。

系統型別在資料庫的特徵：`isSystem = true`、`userId = null`。唯一性由 migration 手寫的 partial unique index（`WHERE "userId" IS NULL`）保證，因為 `@@unique([userId, slug])` 擋不住兩個 `userId` 皆為 NULL 的同名列。seed 因此以 `findFirst` + `create`/`update` 寫入，而非 `upsert`。

## 型別總覽

排序依 `src/lib/db/items.ts` 的 `SYSTEM_TYPE_ORDER`（同 §8 表格順序）。

| 型別 | slug | kind | 圖示（lucide） | 色碼 | Pro 專屬 | demo 數量 |
| --- | --- | --- | --- | --- | --- | --- |
| Snippet | `snippets` | TEXT | `Code` | `#3b82f6` | | 4 |
| Prompt | `prompts` | TEXT | `Sparkles` | `#8b5cf6` | | 3 |
| Command | `commands` | TEXT | `Terminal` | `#f97316` | | 5 |
| Note | `notes` | TEXT | `StickyNote` | `#fde047` | | 0 |
| File | `files` | FILE | `File` | `#6b7280` | ✓ | 0 |
| Image | `images` | FILE | `Image` | `#ec4899` | ✓ | 0 |
| Link | `links` | URL | `Link` | `#10b981` | | 6 |

demo 數量是 `SEED_DEMO=1` 時 `demo@devstash.io` 的 18 筆 items 依型別統計的結果。

## 各型別

### Snippet

- **用途**：可重用的程式碼片段，例如 hooks、utility 函式、Dockerfile。四類目標使用者（§2）中有三類以它為主要型別。
- **主要欄位**：`content`（程式碼本體）、`language`（語法高亮）。demo 資料中 `typescript` 3 筆、`dockerfile` 1 筆。

### Prompt

- **用途**：AI prompt、system message、context 模板，服務 AI-first Developer。
- **主要欄位**：`content`。demo 資料不設 `language`，因為內容是自然語言而非程式碼。

### Command

- **用途**：終端機指令與一系列操作步驟，例如 git、docker、部署指令，用來取代翻找 bash history。
- **主要欄位**：`content`、`language`（demo 資料全部是 `bash`）。

### Note

- **用途**：說明文字、課程筆記、零散的知識紀錄。
- **主要欄位**：`content`。
- **注意**：`#fde047` 在淺色背景上的對比度約 1.5:1，低於 WCAG AA。日後支援淺色模式時，文字需改用較深的黃色（例如 `#a16207`），或只把這個色碼用於邊框（§8）。

### File（Pro）

- **用途**：任意附件，例如設定檔、文件、壓縮檔。
- **主要欄位**：`storageKey`（R2 object key）、`mimeType`、`fileSize`。
- **注意**：資料庫存 object key 而非簽名網址，讀取時才即時簽發網址，因為簽名網址有效期很短（§3.3）。上傳採 presigned URL 直傳，不經過 API route（§4.1）。Free 方案不可用（§6）。

### Image（Pro）

- **用途**：截圖、圖表、設計參考。
- **主要欄位**：與 File 相同。
- **注意**：與 File 的差別只在顯示方式，圖片可以預覽，其他檔案只能下載。是否為圖片以 `mimeType` 判斷，不看副檔名，因為副檔名由使用者控制。

### Link

- **用途**：文件、書籤、參考網址。
- **主要欄位**：`url`。demo 資料使用真實的文件網址，例如 Docker、GitHub Actions 的文件。

## 分類摘要：TEXT / URL / FILE

內容形態（`ItemKind`）定義在 **ItemType** 上，不在 Item 上。這樣資料庫根本表達不出「kind 是 FILE 的 snippet」這種狀態（§3.3）。

| kind | 型別 | 使用的 Item 欄位 | 應為 null 的欄位 |
| --- | --- | --- | --- |
| `TEXT` | snippets、prompts、commands、notes | `content`、`language`（選填） | `url`、`storageKey`、`mimeType`、`fileSize` |
| `URL` | links | `url` | `content`、`storageKey`、`mimeType`、`fileSize` |
| `FILE` | files、images | `storageKey`、`mimeType`、`fileSize` | `content`、`url` |

「應為 null」**目前沒有資料庫約束**，也沒有應用層驗證，只有 seed 照這個規則寫入。`scripts/test-db.ts` 會檢查 demo 資料中 TEXT 與 URL 的欄位是否一致。日後寫 Item CRUD 時，需要在 Zod schema 中依 kind 驗證；也可以考慮在 migration 加上 CHECK constraint，但 kind 存在另一張表，CHECK 無法跨表參照，所以只能靠應用層驗證。

## 共用屬性

不論 kind，所有 Item 都有以下欄位：

- **識別與描述**：`title`（必填）、`description`
- **整理**：`isFavorite`、`pinnedAt`（以時間戳記錄釘選，同時可用來排序）、`collections`（透過 `ItemCollection`）、`tags`（透過 `ItemTag`，`source` 用來區分使用者手動加入與 AI 建議）
- **使用紀錄**：`lastUsedAt`、`useCount`。目前還沒有程式會寫入這兩個欄位
- **生命週期**：`createdAt`、`updatedAt`、`deletedAt`（軟刪除；所有查詢與額度計算都要排除已刪除的資料）
- **擁有權**：`userId`。每個查詢都必須帶入（§4.3）
- **型別**：`itemTypeId`，`onDelete: Restrict`，有 items 的型別不能被刪除

ItemType 本身的共用欄位有 `name`、`slug`、`kind`、`icon`（lucide 圖示名稱字串，由 `src/lib/icons.ts` 的 `getIcon()` 對照回元件，查不到時退回 `File`）、`color`、`isSystem`、`isProOnly`。

## 顯示差異

### 目前已實作

各型別目前的顯示**只差在顏色和圖示**，卡片版面完全相同：

- **`ItemCard`**：左邊框使用型別色碼，圖示方塊的背景為 `color-mix(in srgb, color 10%, transparent)`。卡片只顯示 `title`、`description`、tags、日期，`content`、`url` 等內容欄位都不顯示。
- **`CollectionCard`**：邊框色取 collection 內數量最多的型別，數量相同時依名稱排序；底部列出所有型別的圖示。
- **側邊欄**：依 `SYSTEM_TYPE_ORDER` 列出型別，附上圖示、色碼和數量，`isProOnly` 的型別另外標示 PRO badge。

型別色碼都以 inline style 套用，這是對 coding-standards「No inline styles」的有意識例外，因為色碼來自資料庫。

### 規劃中（依 schema 與 §8 推論，尚未實作）

| kind / 型別 | 預期的顯示方式 |
| --- | --- |
| snippets、commands | 等寬字體，依 `language` 做語法高亮，並提供複製按鈕 |
| prompts、notes | 一般文字，可能以 Markdown 呈現 |
| links | 顯示網域並可在新分頁開啟 |
| images | 以簽名網址顯示預覽圖 |
| files | 顯示檔名、大小、類型，並提供下載按鈕 |

單一 item 在 drawer 中開啟（§8），上表的差異應由這個 drawer 和 `/items/[type]` 共用的元件依 kind 處理。

## 尚未決定或尚未實作

- `/items/[type]` 路由還沒建立，側邊欄的型別連結點了會 404
- 自訂型別：schema 已支援（`userId` 不為 null），但要延後到 Pro 才做；§9 第 5 題建議 v1 只開放 TEXT
- `isProOnly` 目前只用來顯示 PRO badge，Free 方案建立 file、image 的權限檢查尚未實作（§6 的開發期策略：權限判斷集中在一個 `isPro` 函式中）
- `content` 的大小上限尚未決定（§9 第 4 題）
