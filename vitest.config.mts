import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// 只測 server actions 與工具函式，不測元件：node 環境、只收 .test.ts（不含 .tsx）
export default defineConfig({
  resolve: {
    // 與 tsconfig.json 的 paths 相同
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.mts"],
    // 每個測試前重設 vi.fn() 的呼叫紀錄與 mockResolvedValue 等設定、還原 vi.spyOn
    // 與 vi.stubEnv，測試之間互不影響
    mockReset: true,
    restoreMocks: true,
    unstubEnvs: true,
  },
});
