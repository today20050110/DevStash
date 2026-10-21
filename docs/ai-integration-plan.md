# AI 功能整合計畫（GPT-5.6 Luna）

> 四個功能：自動標籤、摘要、程式碼解說、Prompt 優化。依據：`context/research/ai-integration-research.md`、`context/project-overview.md`（§3.3、§6、§10 第 10 步）、`prisma/schema.prisma`，以及現有程式碼（`src/actions/items.ts`、`src/lib/plan.ts`、`src/lib/rate-limit.ts`、`src/lib/server-action.ts`、`src/lib/action-errors.ts`）。
> OpenAI 資訊查自官方文件（developers.openai.com，2026-10-22）與 npm 上的 `openai` 套件 v7.41.0。
> 本文是實作計畫，尚未實作。研究 prompt 指定 gpt-5-nano；依使用者決定（2026-10-22）改用 GPT-5.6 Luna，§11 記錄全部決定。

## 0. 先修正研究 prompt 的前提

| prompt 的假設 | 實際狀況 | 影響 |
| --- | --- | --- |
| Pro 判斷在 `src/lib/usage-limits.ts` | **沒有這個檔案**。方案上限與 Pro 限定功能在 `src/lib/plan.ts`（`getItemLimit`、`canUploadFiles`…，接收 `isPro` 布林值）；用量計數在 `src/lib/usage.ts` | AI 的方案上限加在 `plan.ts`（`getAiLimit`），用量計數另開 `src/lib/ai-usage.ts` |
| 資料模型已能記錄四種功能 | `AiFeature` enum 只有 `AUTO_TAG`、`TITLE_SUGGEST`、`SUMMARIZE`，**沒有**程式碼解說與 prompt 優化 | 需要一個 migration 加上 `EXPLAIN_CODE`、`OPTIMIZE_PROMPT`（見 §2.1） |
| 摘要要存在某個欄位 | Item 沒有 `summary` 欄位，但有使用者可編輯的 `description` | 摘要以「建議填入 description」呈現，不新增欄位（見 §6.2） |

已經就緒、可以直接用的：

- `.env` 已有 `OPENAI_API_KEY`（只確認了鍵名）
- `AiUsage` 表（`feature`、`inputTokens`、`outputTokens`、`userId`、`itemId`，索引 `[userId, createdAt]`）——每日上限的依據
- `ItemTag.source`（`USER`／`AI_SUGGESTED`／`AI_ACCEPTED`）——自動標籤要的「AI 建議 vs 使用者確認」
- Upstash 速率限制（`checkRateLimit`），project-overview §3.4 已註明「日後 AI 用量上限也可以沿用」
- 首頁行銷文案已寫 Pro 含「AI tags, summaries & explanations」、「Prompt optimization」

## 1. 模型：GPT-5.6 Luna

OpenAI 的 gpt-5-nano model 頁建議「速度與成本敏感的新工作負載」改用 Luna，依使用者決定採用。

| 項目 | GPT-5.6 Luna（採用） | gpt-5-nano（原規格，對照用） |
| --- | --- | --- |
| Model ID | `gpt-5.6-luna`（只有這個 snapshot） | `gpt-5-nano-2025-08-07` |
| 輸入／快取輸入／輸出（每 1M tokens） | **$0.20／$0.02／$1.20** | $0.05／$0.005／$0.40 |
| 快取寫入 | 輸入價 × 1.25（30 分鐘 TTL） | 不另計 |
| Context window | 1.05M（輸入上限 922K；超過 272K 的請求整筆加價） | 400K（輸入上限 272K） |
| 輸出上限 | 128K | 128K |
| 知識截止 | 2026-02-16 | 2024-05-31 |
| reasoning effort | `none`、`low`、`medium`（預設）、`high`、`xhigh`、`max`——**沒有 `minimal`** | 含 `minimal` |
| 支援 | Responses API、streaming、structured outputs、function calling、prompt caching、圖片輸入 | 同左 |
| 預設速率（Build tier） | 5,000 RPM、2M TPM | 同左 |

**單價是 nano 的 3–4 倍，但可以完全不推理。** 推理 tokens 按輸出價計費，也算進 `max_output_tokens`。Luna 支援 `effort: "none"`，四個功能都不需要推理，一律設 `none`——只付可見輸出的錢，抵銷了一部分單價差距（成本見 §7）。不設定的話預設是 `medium`，成本會高出許多，**這個參數不能漏**。

model ID 放在單一常數（§3.1），日後換模型只改一行。Model 頁沒有列出 `text.verbosity`，實作時先確認 Luna 是否接受；不接受就拿掉，改在 instructions 裡指定長度。

## 2. 資料模型

### 2.1 Migration

```prisma
enum AiFeature {
  AUTO_TAG
  TITLE_SUGGEST   // 保留，本計畫不使用
  SUMMARIZE
  EXPLAIN_CODE    // 新增
  OPTIMIZE_PROMPT // 新增
}
```

`prisma migrate dev --name ai_features`。Postgres 的 `ALTER TYPE … ADD VALUE` 對既有資料無影響。

### 2.2 不新增的欄位

- **不存 AI 結果**：解說與優化後的 prompt 是一次性的，使用者接受後才寫進 item 的既有欄位（`description`、`content`、tags）。不必處理「內容改了、快取的解說過期」的問題
- **不存 `estimatedCost`**：成本由 `inputTokens`／`outputTokens` 乘單價即時算出，單價變動時不必回填

## 3. SDK 設定

### 3.1 安裝與 client

```bash
npm install openai   # v7.x；peer dependency zod ^3.25 || ^4.0，與專案的 zod 4 相容；需要 Node 22+
```

`src/lib/openai.ts`——沿用 `src/lib/stripe.ts` 的「第一次使用時才建立」模式（`ce122dc` 修過：module 載入時建立 client，缺金鑰會讓 build 失敗）：

```ts
import OpenAI from "openai";

/** 全站唯一的 model 設定；換模型只改這裡 */
export const AI_MODEL = "gpt-5.6-luna";

let client: OpenAI | undefined;

/** 第一次呼叫時建立；缺 OPENAI_API_KEY 時丟錯，由呼叫端的 try/catch 處理 */
export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({
      apiKey,
      timeout: 30_000, // 預設 10 分鐘，對互動功能太長
      maxRetries: 1,   // SDK 預設 2；429／5xx／連線錯誤會自動重試
    });
  }
  return client;
}
```

`import "server-only"` 放在這個檔案頂端，避免被 client 元件誤引入而把金鑰打包進前端。

### 3.2 用 Responses API，不用 Chat Completions

OpenAI 的新功能（structured outputs 的 `responses.parse`、typed streaming events）都以 Responses API 為主。共用參數：

```ts
{
  model: AI_MODEL,
  reasoning: { effort: "none" },       // Luna 預設 medium；不推理就沒有 reasoning tokens 的費用
  text: { verbosity: "low" },          // 標籤、摘要要短；解說可改 "medium"
  max_output_tokens: 2_000,            // 依功能調整，見 §5.3
  store: false,                        // 不在 OpenAI 端保存回應（使用者的私人內容）
  safety_identifier: hashedUserId,     // 讓 OpenAI 在濫用時能定位到使用者，但不送出 email 或 id 原文
}
```

### 3.3 Structured outputs（自動標籤、摘要）

```ts
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const TagSuggestions = z.object({
  tags: z.array(z.string()).max(5),
});

const response = await getOpenAI().responses.parse({
  ...COMMON,
  instructions: AUTO_TAG_INSTRUCTIONS,   // 固定的系統指示，放最前面（利於快取，見 §7.2）
  input: buildItemInput(item),           // 使用者內容放最後
  text: { format: zodTextFormat(TagSuggestions, "tag_suggestions"), verbosity: "low" },
});
const parsed = response.output_parsed;   // 型別即 z.infer<typeof TagSuggestions>
```

回傳後**仍要正規化**（沿用 `src/lib/tags.ts` 的 slug 規則），並過濾掉 item 已有的標籤。schema 保證結構，不保證內容合理。

## 4. 架構：server action 還是 route handler

| 功能 | 輸出 | 傳輸方式 | 理由 |
| --- | --- | --- | --- |
| 自動標籤 | 最多 5 個字串 | **Server action**，不串流 | 結果很短，要整包拿到才能顯示成可接受／拒絕的 chip |
| 摘要 | 1–2 句 | **Server action**，不串流 | 同上；要整段才能「套用到 description」 |
| 程式碼解說 | 數段 Markdown | **Route handler 串流** | 輸出長，逐字出現能大幅降低體感等待 |
| Prompt 優化 | 一段改寫後的 prompt | **Server action**，不串流 | 要整段才能做「接受／拒絕」的比較；長度與原 prompt 相近 |

這和 `context/coding-standards.md` 一致：簡單的 mutation 用 server action，「long-running operations」用 API route。

### 4.1 Server action 的流程（以自動標籤為例）

沿用 `createItem` 的順序與 `{ success, data, error }` 回傳格式：

```ts
"use server";

// 不叫 suggestTags：src/lib/tags.ts 已有同名函式（Tags 欄位的自動完成）
export async function suggestItemTags(itemId: unknown): Promise<AiActionResult<string[]>> {
  const parsedId = itemIdSchema.safeParse(itemId);          // 1. Zod 驗證
  if (!parsedId.success) return { success: false, error: ITEM_NOT_FOUND };
  try {
    const userId = await getCurrentUserId();                // 2. 登入
    if (!userId) return { success: false, error: NOT_SIGNED_IN_MESSAGE };

    const gate = await checkAiAccess(userId, "AUTO_TAG");   // 3. Pro + 速率 + 每日額度（§5）
    if (!gate.ok) return { success: false, error: gate.error, code: gate.code };

    const item = await getItemForAi(userId, parsedId.data); // 4. 只取自己的、未刪除的 item
    if (!item) return { success: false, error: ITEM_NOT_FOUND };

    const result = await generateTagSuggestions(item, userId); // 5. src/lib/ai/auto-tag.ts
    return { success: true, data: result };
  } catch (error) {
    console.error("suggestItemTags failed", error);
    return { success: false, error: toAiErrorMessage(error) };  // 6. 錯誤對應（§5.4）
  }
}
```

- 第 5 步的 OpenAI 呼叫與用量紀錄放在 `src/lib/ai/`，action 只負責流程，符合 coding-standards 的測試分工（action 測流程，lib 測邏輯）
- client 端照現有慣例以 `callServerAction()` 呼叫，網路錯誤不會掉進 error boundary

### 4.2 串流的 route handler（程式碼解說）

`src/app/api/ai/explain/route.ts`：

```ts
export async function POST(request: Request) {
  // 驗證、gate、讀 item 與 §4.1 相同；失敗時回 apiError(...)（401／402／429）

  const stream = await getOpenAI().responses.create({
    ...COMMON,
    instructions: EXPLAIN_INSTRUCTIONS,
    input: buildCodeInput(item),
    text: { verbosity: "medium" },
    stream: true,
  }, { signal: request.signal });   // 使用者關閉 drawer → 中止上游請求，不再付費

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(event.delta));
          } else if (event.type === "response.completed") {
            await recordAiUsage(userId, "EXPLAIN_CODE", item.id, event.response.usage);
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
```

- 回傳純文字串流即可；client 用 `fetch` + `response.body.getReader()` 讀取，逐段 append 到 Markdown 預覽（沿用 `MarkdownPreview`）
- Vercel Functions 預設 timeout 300 秒，Node.js runtime 原生支援串流，**不需要** `runtime = "edge"`
- `/api/*` 不在 proxy 的 matcher 內，route 自行驗證登入（和 `/api/stripe/checkout` 一樣）

## 5. 權限、額度與錯誤處理

### 5.1 三層檢查（`checkAiAccess`）

依序執行，任一層失敗就不呼叫 OpenAI：

| 層 | 實作 | 失敗時 |
| --- | --- | --- |
| 1. 方案額度 | `plan.ts` 新增 `getAiLimit(pro)`，與 `getItemLimit` 同一模式：Pro 回傳 `{ count: AI_DAILY_LIMIT, window: "day" }`，Free 回傳 `{ count: AI_FREE_TRIAL_LIMIT, window: "month" }` | 見第 3 層 |
| 2. 短時間速率 | `rate-limit.ts` 的 `LIMITS` 加 `ai: { tokens: 10, window: "1 m" }`，鍵為 userId | `rateLimitMessage(reset)`，與其他動作一致 |
| 3. 用量上限 | `src/lib/ai-usage.ts`：依第 1 層的窗口計算 `AiUsage` 筆數，四個功能**共用**同一個上限 | Pro：`code: "DAILY_LIMIT"`，「You've used today's 50 AI requests. Try again tomorrow.」；Free：`code: "TRIAL_USED"`，「You've used your 5 free AI requests this month.」並顯示升級提示（連到 `/upgrade`） |

常數放在 `plan.ts`：

```ts
/** Pro 每日 AI 次數，四個功能共用。§6 建議 100，改用 Luna 後為控制最壞情況成本降為 50（§7.1） */
export const AI_DAILY_LIMIT = 50;
/** Free 每月試用次數，四個功能共用 */
export const AI_FREE_TRIAL_LIMIT = 5;
```

- **窗口**：Pro 是「過去 24 小時」的滾動窗口（不必處理時區）；Free 是「UTC 的當月」，每月 1 日重置，提示文字可以明確寫出重置日
- **Free 試用改變了 project-overview §6 的「AI 功能 Free ✗」**，實作時要同步更新 §6 的表格與首頁 pricing 的 Free 功能清單

**第 2 層與第 3 層分工**：Upstash 擋腳本連發（fail open，Redis 掛了照樣放行）；資料庫的 `AiUsage` 是成本的真正上限，可稽核，不受 Redis 狀態影響。

### 5.2 每日額度的競態

「先數、再呼叫、再寫入」在同時送出多個請求時會超額。做法：**呼叫前先插入一筆 `AiUsage`（tokens 為 0）佔額度，完成後再更新 token 數**；呼叫失敗時刪除該筆，不讓失敗的請求吃掉額度。最多超額的數量等於同一瞬間的並發數，加上第 2 層的每分鐘 10 次，實務上可以接受，不需要 transaction 鎖。

### 5.3 輸入與輸出的上限

| 功能 | 送出的內容 | 輸入上限 | `max_output_tokens` |
| --- | --- | --- | --- |
| 自動標籤 | title + description + content 前段 | 8,000 字元 | 1,000 |
| 摘要 | 同上 | 16,000 字元 | 1,000 |
| 程式碼解說 | content（+ `language`） | 24,000 字元 | 4,000 |
| Prompt 優化 | content | 16,000 字元 | 4,000 |

- Pro 的 content 上限是 1 MB（`PRO_CONTENT_LIMIT_BYTES`），約 25 萬 tokens。Luna 的 context 放得下，但一次要花約 $0.05 的輸入費，而且接近 272K 的加價門檻，**一定要截斷**。截斷時在 prompt 裡註明「內容已截斷」，UI 也提示
- 若輸出達到 `max_output_tokens`，回應的 `status` 是 `incomplete`、`incomplete_details.reason` 是 `max_output_tokens`——要當成錯誤處理（「The AI response was cut off, please try again」），不能把截斷的結果當成完整答案。`effort: "none"` 沒有 reasoning tokens，上表的上限都只用在可見輸出
- 只對 TEXT 型別開放；FILE 與 URL 型別不送（URL 不抓網頁內容，避免 SSRF 與成本）

### 5.4 錯誤對應

| 情況 | 來源 | 回給使用者 |
| --- | --- | --- |
| 未設定金鑰 | `getOpenAI()` 丟錯 | 「AI features are not available right now」，並 `console.error` |
| 429（OpenAI 的速率或額度） | `OpenAI.RateLimitError`（SDK 已重試 1 次） | 「AI is busy, please try again in a moment」 |
| 逾時 | `OpenAI.APIConnectionTimeoutError` | 「The AI request timed out, please try again」 |
| 5xx、連線錯誤 | `OpenAI.APIError`／`APIConnectionError` | `GENERIC_ERROR_MESSAGE` |
| 拒答 | output 裡有 `refusal` | 「The AI couldn't process this content」 |
| 截斷 | `status === "incomplete"` | 見 §5.3 |

錯誤訊息一律是固定字串，**不把 OpenAI 的原始錯誤訊息傳到前端**（可能含請求細節）。

## 6. 各功能設計與 UI

共通原則：**AI 只產生建議，不直接寫入資料**。使用者按「接受」才走既有的 `updateItem` 寫入，所以額度、驗證、權限檢查都沿用現有路徑。

入口放在 item drawer（`ItemDrawerActions`）的一個「AI」下拉選單，依型別顯示可用的項目。**只在已存在的 item 上提供**——新增 item 的表單沒有 AI 功能（§8 第 2 點：action 只接受 `itemId`）。

Free 使用者照常使用，選單底部顯示「3 of 5 free AI requests left this month」；用完後選單項目維持可見，點了顯示升級提示（連到 `/upgrade`），不呼叫 action。

### 6.1 自動標籤（`AUTO_TAG`）

- 編輯模式的 Tags 欄位旁加「Suggest」按鈕
- 結果顯示為虛線框的 chip，每個可單獨接受（✓）或忽略（×），另有「Accept all」
- 接受的標籤寫入時 `ItemTag.source = AI_ACCEPTED`
- `AI_SUGGESTED` 這個值目前不寫入資料庫（建議只存在於畫面上）；日後若要背景自動建議，再用它存「待確認」的標籤

### 6.2 摘要（`SUMMARIZE`）

- 適用於所有 TEXT 型別
- drawer 顯示產生的摘要卡片：「Use as description」／「Discard」
- description 已有內容時，按鈕改為「Replace description」，避免無聲覆蓋

### 6.3 程式碼解說（`EXPLAIN_CODE`）

- 只對 snippet、command 顯示（有 `language` 的型別）
- 在 drawer 內展開一個區塊，串流顯示 Markdown；有「Stop」按鈕（呼叫 `AbortController.abort()`，伺服器端靠 `request.signal` 中止上游）
- 唯讀，不寫回 item；使用者要保留可以自己複製

### 6.4 Prompt 優化（`OPTIMIZE_PROMPT`）

- 只對 prompt 型別顯示
- 結果以「原文 ／ 建議」上下兩欄呈現（不需要 diff 套件；長 prompt 的逐字 diff 反而難讀），按鈕「Replace content」／「Discard」
- 接受後進入編輯模式並填入新內容，使用者確認後才儲存——比直接寫入多一步，但 prompt 是使用者精心寫的資產，值得多一步

### 6.5 載入狀態

| 狀態 | 呈現 |
| --- | --- |
| 等待中（非串流） | 按鈕內 `Loader2` 旋轉 + disabled，沿用 `UpgradeButtons` 的模式；結果區顯示 `Skeleton` |
| 串流中 | 文字逐段出現，結尾閃爍游標；「Stop」按鈕 |
| 失敗 | `toast.error(error)`，與其他 action 一致 |
| 額度用完 | toast 加上重置時間；Settings 的 Billing 區塊顯示用量（Pro「AI requests today: 37 / 50」、Free「Free AI requests this month: 3 / 5」） |

## 7. 成本

### 7.1 估算

Luna、`effort: "none"`（沒有 reasoning tokens）：

| 功能 | 輸入 tokens | 輸出 tokens | 每次成本 |
| --- | --- | --- | --- |
| 程式碼解說（最貴） | ~6,000 | ~1,500 | 6,000 × $0.20/1M + 1,500 × $1.20/1M ≈ **$0.0030** |
| Prompt 優化 | ~4,000 | ~1,000 | ≈ $0.0020 |
| 摘要 | ~3,000 | ~100 | ≈ $0.0007 |
| 自動標籤 | ~2,000 | ~50 | ≈ $0.0005 |

**每日上限因此定為 50 次（不是 §6 建議的 100 次）。** 若維持 100 次，一位 Pro 使用者每天用滿、全部是程式碼解說、連續 30 天約 **$9／月**，超過 $8 的月費（扣掉 Stripe 手續費後實收約 $7.5）。降到 50 次後：

| 情境（Pro，每天用滿 50 次，30 天） | 每月成本 |
| --- | --- |
| 全部是程式碼解說（最壞情況） | 約 $4.5 |
| 四種功能平均使用（每次約 $0.0016） | 約 $2.4 |

考慮過但沒採用的：加權計次（解說與優化算 2 次——較公平，但次數對使用者變得難以理解）、維持 100 次靠監控處理。

Free 試用每人每月最多 5 次，最壞約 $0.015，可忽略。

### 7.2 降低成本的做法

1. **`effort: "none"`**：Luna 預設 `medium`，推理 tokens 按輸出價 $1.20/1M 計，不關掉的話成本可能翻倍
2. **輸入截斷**（§5.3）：避免 1 MB 的 content 一次花掉約 $0.05 的輸入費
3. **Prompt caching**：固定的 `instructions` 放最前面、使用者內容放最後，並在固定內容之後加上明確的 cache breakpoint（GPT-5.6 起支援）。快取讀取價是一般的 1/10，但**寫入要多付 25%**，且前綴至少要 1,024 tokens 才會快取。系統指示通常不到 1,024 tokens，強行快取反而多付寫入費——v1 不啟用，等指示變長再評估
4. **前端去重**：同一個 item、內容未變時，再按一次直接顯示上次的結果（存在 client state，不存資料庫）
5. **不做背景自動執行**：所有 AI 呼叫都由使用者觸發，不在儲存 item 時自動跑標籤
6. **Batch API**：目前沒有批次需求；日後若要「一次替所有舊 item 建議標籤」，用 Batch API 可省一半

### 7.3 監控

`AiUsage` 已有足夠資訊。初期每週查一次：

```sql
SELECT feature, count(*), sum("inputTokens"), sum("outputTokens")
FROM "AiUsage" WHERE "createdAt" > now() - interval '7 days' GROUP BY feature;
```

另外在 OpenAI 後台設定專案的月用量上限與警示，作為最後一道防線。

## 8. 安全性

1. **金鑰只在伺服器端**：`OPENAI_API_KEY` 不加 `NEXT_PUBLIC_` 前綴；`src/lib/openai.ts` 加 `import "server-only"`；Vercel 上設為 Sensitive（與 `RESEND_API_KEY`、Upstash `KV_*` 相同處理）。本機用 `.env`，`.env._production` 只是參考副本
2. **授權**：AI action 只接受 `itemId`，伺服器端以 `userId` 讀取 item（沿用 repository 函式，`deletedAt: null`），**不接受前端傳來的內容**——否則任何人都能拿這個端點當免費的 OpenAI proxy
3. **Prompt injection**：使用者內容可能包含「忽略以上指示」。緩解方式：
   - 系統指示放在 `instructions`，使用者內容放在 `input`，並用明確的分隔標記包住（例如 `<item_content>…</item_content>`），指示中說明標記內是資料、不是指令
   - structured outputs 限制輸出形狀（標籤只能是字串陣列）
   - 輸出只作為建議，寫入前經過既有的 Zod 驗證；Markdown 由 `MarkdownPreview` 渲染，沿用它的 HTML sanitization
   - 影響範圍只有使用者自己的資料（沒有工具呼叫、沒有跨使用者內容），注入的最壞結果是使用者自己看到奇怪的建議
4. **隱私**：`store: false`；`safety_identifier` 送 userId 的雜湊，不送 email
5. **輸入驗證**：所有 action 參數以 Zod 驗證（coding-standards）；截斷在伺服器端做，不信任前端

## 9. 替代方案：Vercel AI SDK

專案部署在 Vercel，AI SDK（`ai` 套件）+ AI Gateway 是另一條路：統一的串流 hook（`useCompletion`）、日後換模型或供應商不必改程式碼、Gateway 提供用量觀測與 fallback。

本計畫仍建議**直接用 `openai` SDK**：

- 供應商已確定是 OpenAI（project-overview §7），四個功能都是單次呼叫，沒有多輪對話或工具呼叫，用不到 AI SDK 的主要優勢
- 少一層抽象，Responses API 的 `reasoning`、`verbosity`、`store`、`safety_identifier` 直接可用
- 串流只有一個端點，手寫 `ReadableStream` 約 20 行

若日後要加對話式功能（例如「問我的 stash」），再評估改用 AI SDK。

## 10. 實作順序

1. Migration：`AiFeature` 加兩個值
2. `src/lib/openai.ts`（lazy client，`AI_MODEL = "gpt-5.6-luna"`）、`plan.ts` 的 `getAiLimit`、`AI_DAILY_LIMIT`、`AI_FREE_TRIAL_LIMIT`、`rate-limit.ts` 的 `ai` 限制；先以一次實際呼叫確認 Luna 接受 `effort: "none"` 與 `text.verbosity`
3. `src/lib/ai-usage.ts`：`checkAiAccess`（Pro 滾動 24 小時、Free UTC 當月）、佔額度／更新／釋放（§5.2），附單元測試
4. 自動標籤（最簡單、最能驗證整條路徑）：`src/lib/ai/auto-tag.ts` + `suggestItemTags` action + Tags 欄位的 chip UI
5. 摘要、Prompt 優化（同一個 action 模式）
6. 程式碼解說（route handler 串流）
7. Settings 顯示 AI 用量；`project-overview.md` §6 與首頁 pricing 的 Free 欄位補上「5 AI requests / month」，§6 的成本護欄（模型改為 `gpt-5.6-luna`、每日上限改為 50 次）與 §7 技術棧的 `gpt-5-nano` 改為 `gpt-5.6-luna`，並確認首頁 AI 文案與實際功能一致

每一步都獨立可上線。測試照 coding-standards：mock `openai` 與 `@/lib/prisma`，測流程（未登入、非 Pro、額度用完、截斷、拒答、逾時），不打真的 API。

## 11. 決定紀錄

使用者於 2026-10-22 決定：

| # | 問題 | 決定 | 反映在 |
| --- | --- | --- | --- |
| 1 | 每日上限是否四個功能共用 | **共用** | §5.1 |
| 2 | Free 是否給少量試用 | **給**，每月 5 次（數字沿用原提案，可再調） | §5.1、§6、§10 第 7 步 |
| 3 | 新增 item 時是否提供 AI | **不提供**（避免 AI 端點變成可代送任意內容的 proxy） | §6、§8 第 2 點 |
| 4 | 模型 | **GPT-5.6 Luna** | §1、§3、§7 |
| 5 | Pro 每日上限 | **50 次**（改用 Luna 後，100 次的最壞情況每月約 $9，超過月費） | §5.1、§6.5、§7.1 |

## 參考資料

- GPT-5.6 Luna model 頁 — https://developers.openai.com/api/docs/models/gpt-5.6-luna
- GPT-5 nano model 頁（對照用）— https://developers.openai.com/api/docs/models/gpt-5-nano
- Structured outputs（`responses.parse`、`zodTextFormat`）— https://developers.openai.com/api/docs/guides/structured-outputs
- Reasoning（effort、reasoning tokens、`max_output_tokens`、incomplete）— https://developers.openai.com/api/docs/guides/reasoning
- Prompt caching — https://developers.openai.com/api/docs/guides/prompt-caching
- Responses 串流事件 — https://developers.openai.com/api/docs/guides/responses-vs-chat-completions
- TypeScript SDK（重試、timeout、錯誤類別）— https://developers.openai.com/api/reference/typescript
- `openai` npm 套件 v7.41.0（peer dependency `zod ^3.25 || ^4.0`，Node ≥ 22）
- 價格交叉比對：https://anotherwrapper.com/llm-pricing/gpt-5-nano-2025-08-07
