# Current Feature: AI Explain Code

## Status

In Progress

## Goals

- 新增 `explainCode` server action：驗證 session、Pro 限定、Zod 驗證輸入、速率限制
- 程式碼編輯器的視窗標頭加上 Explain 按鈕（Sparkles 圖示），位置在 Copy 按鈕旁
- 只在 item drawer 的 snippet 與 command 顯示，新增／編輯表單不顯示
- 產生後，編輯器標頭出現 Code／Explain 分頁，可切換兩種檢視
- 說明以 Markdown 渲染，放在與程式碼編輯器相同的容器空間內
- 說明精簡（約 200–300 字），涵蓋程式碼在做什麼與關鍵概念
- 產生中顯示 Loader2 spinner
- Free 使用者在 UI 上看到 Crown 圖示與 tooltip「AI features require Pro subscription」
- 錯誤以 toast 顯示（Pro 限制、速率限制、AI 服務錯誤）
- 沿用既有 AI 功能的模式
- 為 server action 寫單元測試

## Notes

- 說明不存進資料庫，每次點擊都重新產生
- 只在 item drawer 的唯讀檢視可用，新增／編輯表單不提供
- `isPro` 需要以 prop 傳給 item drawer／程式碼編輯器
- 架構背景見 `docs/ai-integration-plan.md`
- 模型：spec 寫 `gpt-5-nano`，但專案已決定（2026-10-22）所有 AI 功能改用 GPT-5.6 Luna，沿用 `src/lib/openai.ts` 的 `AI_MODEL`
- 沿用既有 AI 護欄：Upstash 每小時上限，加上 `AiUsage` 的每日上限（過去 24 小時 50 次，所有 AI 功能共用）
- 參考既有實作：`src/actions/ai.ts`、`src/lib/ai-description.ts`、`src/lib/ai-tags.ts`

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
