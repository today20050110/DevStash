# Current Feature: Image Gallery View

## Status

In Progress

## Goals

- `/items/images` 不再用一般的 `ItemCard`，改用新的圖片縮圖卡片
- 圖片以網格／畫廊排列，寬螢幕為 3 欄
- 縮圖為 16:9（`aspect-video`），以 `object-cover` 填滿卡片（可能裁切邊緣）
- hover 時圖片輕微放大（scale 105%，300ms transition）

## Notes

- 來源：`context/features/image-display-spec.md`
- 現況：`src/app/(app)/items/[type]/page.tsx` 對所有型別都渲染 `ItemCard`，grid 為 container query `@3xl:grid-cols-2 @5xl:grid-cols-3`；`ItemSummary`（`findItemSummaries`）沒有檔案欄位，需要補上（例如 `hasFile` 或 `file`），不可送出 `storageKey`
- 圖片來源只能是 `GET /api/items/[id]/file`（bucket 私有，驗證登入與擁有者後串流轉送，`private, max-age=300`、`attachment`、CSP sandbox；`<img>` 不受 attachment 影響）
- 判斷「圖片卡片」宜依 `ItemType.kind === "FILE"` 加 `mimeType` 以 `image/` 開頭，而不是寫死 slug，與 `getItemTypeFields` 的做法一致
- 點擊卡片仍要開啟 item drawer（沿用 `ItemCardTrigger` 的覆蓋按鈕做法）；hover 放大需外層 `overflow-hidden`，避免溢出圓角
- 使用者決定（皆採建議）：欄數沿用現有斷點（1／`@3xl` 2／`@5xl` 3 欄）；卡片為圖片 + 標題（含 pin／星號）；`downloadFile` 速率限制維持 120 次／分鐘；只改型別列表頁，dashboard 維持 `ItemCard`
- 實作：`findItemSummaries` 多 select `storageKey`、`mimeType`，對外只回傳 `ItemSummary.isImage`（有檔案且 `isImageMimeType`），不送出 key；新增 `src/components/items/ImageCard.tsx`（`aspect-video` + `overflow-hidden`，`<img>` 為 `object-cover`、`loading="lazy"`、`decoding="async"`，`group-hover/card:scale-105` 與鍵盤焦點時同樣放大，`duration-300`）；`/items/[type]` 依 `item.isImage` 逐筆選卡片，不寫死 slug
- 實測發現並修正：`ItemCardTrigger` 原本放在卡片第一個子元素，hover 時圖片因 `scale` 被提升到定位層、蓋住透明按鈕而點不到；改放在最後一個子元素
- 驗證（Development，demo 帳號，上傳 1600×600、600×1200、800×800 三張測試圖）：1440 三欄（每欄 363px）、1280 兩欄、390 單欄且無水平捲動，三張縮圖皆為 16:9 並以 cover 裁切；hover 時 `scale` 1.05、超出部分被裁掉；點擊開啟 drawer；長標題截斷；dashboard 的圖片 item 仍為一般卡片；主控台 0 errors。`src/lib/db/items.test.ts` 補 `getItemsByType` 3 個測試，`npm test` 190/190、tsc、lint、build 通過
- 資料：三筆測試圖片 item（`wide-landscape`、`A very long portrait screenshot title…`、`square`）與其 R2 物件經使用者確認保留在 Development 的 demo 帳號，供之後測試
- 已知情況：沒有另外產生縮圖，卡片載入的是原圖（最大 5 MB）；`downloadFile` 每分鐘 120 次，圖片很多時頻繁重新整理可能被擋

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
