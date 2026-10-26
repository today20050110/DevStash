# Current Feature: AI Prompt Optimization

## Status

In Progress

## Goals

- prompt 型別的 Markdown 編輯器標頭加上 Optimize 按鈕，做法比照 snippet／command 標頭的 Explain 按鈕
- 只在 item drawer 的 prompt 顯示，新增／編輯表單不顯示
- AI 檢視目前的 prompt，需要時加以改善，回傳改寫後的版本
- 顯示改寫結果，詢問使用者是否要採用更新後的 prompt（接受／放棄）
- 新增 server action：驗證 session、Pro 限定、Zod 驗證輸入、速率限制與每日上限
- 產生中顯示 Loader2；Free 使用者顯示 Crown 與需要 Pro 的 tooltip（與 Explain 一致）
- 錯誤以 toast 顯示（Pro 限制、速率限制、AI 服務錯誤）
- 為 server action 與 lib 函式寫單元測試

## Notes

- 模型沿用 GPT-5.6 Luna（`src/lib/openai.ts` 的 `AI_MODEL`）
- 沿用既有 AI 護欄：`runAiFeature` 的登入 → Pro → Upstash 每小時 20 次 → `AiUsage` 每日 50 次
- 需要 migration：`AiFeature` 加 `OPTIMIZE_PROMPT`（只套用 Development）
- prompt 不需要改善時，應告知使用者而不是硬改
- 參考既有實作：`src/lib/ai-explain.ts`、`src/components/items/ExplainCodeButton.tsx`、`src/components/items/CodeEditor.tsx`、`src/components/items/MarkdownEditor.tsx`
- 計畫書（`docs/ai-integration-plan.md` §6.4）原設計：結果以「原文／建議」呈現，「Replace content」／「Discard」，接受後進入編輯模式並填入新內容，使用者確認後才儲存
- 使用者決定：接受後照計畫書進入編輯模式，content 填入新 prompt，由使用者按 Save 才儲存（Cancel 即放棄，不另做 Undo）

## History

已完成項目記錄在 `context/feature-history.md`（不自動載入，需要過往決策或已知情況時再讀）。
