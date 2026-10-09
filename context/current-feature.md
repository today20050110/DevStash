# Current Feature: Quick Copy on Item Cards

## Status

In Progress

## Goals

- 一般 `ItemCard`（dashboard 的 Pinned／Recent 與 snippets／prompts／commands／notes／links 列表）加上快速複製圖示
- TEXT kind 複製 `content`、URL kind 複製 `url`，與 drawer 的 Copy 相同
- 點擊複製不會開啟 drawer；成功時圖示短暫變成勾，失敗時有錯誤提示
- 圖示一直顯示（淡色），觸控裝置也能用

## Notes

- 來源：使用者 inline 描述「add a quick copy icon to the cards」
- 使用者決定（皆採建議）：只加在一般 `ItemCard`，`ImageCard` 與 `FileList` 不加（沒有文字可複製，檔案列已有下載）；點擊時才經 `GET /api/items/[id]` 載入內容，列表查詢維持不載入 `content`；圖示一直顯示
- 判斷是否顯示：`ItemSummary.file === null`（FILE kind 一定有檔案），不需要在列表多查 `kind`；dashboard 中的圖片／檔案 item 也是 `ItemCard`，依此隱藏
- 剪貼簿：fetch 是非同步的，Safari 會因為使用者手勢在 await 之後失效而拒絕 `writeText`；改用 `navigator.clipboard.write([new ClipboardItem({ "text/plain": promise })])` 在點擊當下就呼叫，內容由 promise 提供；不支援 `ClipboardItem` 時退回 await 後 `writeText`
- 複製值的判斷（URL → `url`，其他 → `content`）抽到 `src/lib/` 與 drawer 共用並寫單元測試；`useCopyToClipboard` 擴充為可接受 promise 並回傳是否成功
- 按鈕疊在 `ItemCardTrigger` 之上（`relative z-10`，兄弟元素而非巢狀），點擊不會開啟 drawer
- 回饋：成功時圖示換成勾 2 秒（沿用 hook 的 `copied`）；失敗（內容為空、請求失敗、剪貼簿被拒）以 sonner toast 顯示
- 實作：`src/lib/item-copy.ts` 的 `getCopyValue`（drawer 的 `ItemDrawerActions` 改用它）；`useCopyToClipboard` 的 `copy` 接受 `string | Promise<string>` 並回傳 `boolean`；新增 `src/components/items/CopyItemButton.tsx`（`icon-sm` ghost 按鈕，點擊時把 `fetch /api/items/[id]` 的 promise 交給剪貼簿，失敗時 `toast.error`）；`ItemCard` 在日期右側、`!item.file` 時渲染
- 驗證（Development，demo 帳號，1440 與 390）：`/items/snippets` 複製到完整 Dockerfile 內容、`/items/links` 複製到網址，drawer 皆未開啟，「Copied」2 秒後恢復；以 `page.route` 讓 API 回 500 時顯示「Couldn't copy …」且剪貼簿未被改動（主控台唯一的 error 就是這個模擬的 500）；dashboard 的文字／連結卡片有複製圖示，8 張圖片與檔案卡片沒有；390 時按鈕 28×28、無水平捲動。新增 `src/lib/item-copy.test.ts`（3 個），`npm test` 197/197、tsc、lint、build 通過
- 已知情況：hook 本身沒有單元測試（coding-standards 只測 `src/lib/` 與 actions，`src/hooks/` 不在範圍）；Firefox 127 以前沒有 `ClipboardItem`，會退回 await 後 `writeText`

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
