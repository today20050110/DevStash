// 單元測試不得連到任何外部服務。Vitest 不會把 .env 載入 process.env，
// 這裡再清一次，避免從 shell 繼承的變數讓沒 mock 到的模組真的連上
// Neon（DATABASE_URL 可能是 production）、Upstash 或 Resend。
for (const key of [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
]) {
  delete process.env[key];
}
