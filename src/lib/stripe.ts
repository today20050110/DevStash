import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * 伺服器端的 Stripe client，第一次呼叫時才建立並快取。
 * 不在 module 載入時建立：沒有 STRIPE_SECRET_KEY 時建構子會丟例外，而 build 會載入每個 route，
 * 少一個環境變數就會讓整個部署失敗；延遲建立後只有實際呼叫 Stripe 的請求會失敗。
 * 沒有指定 apiVersion：使用 stripe 套件 v23 的預設版本（2026-09-30.endive），套件的型別也只對應這個版本
 */
export function getStripe(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    client = new Stripe(apiKey, { typescript: true });
  }
  return client;
}
