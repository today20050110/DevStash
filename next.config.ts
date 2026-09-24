import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 開發模式的 Dev Tools 按鈕預設在左下角，會蓋住側邊欄底部的使用者頭像
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
