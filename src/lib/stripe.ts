import Stripe from "stripe";

/**
 * 伺服器端的 Stripe client。沒有指定 apiVersion：使用 stripe 套件 v23 的預設版本
 * （2026-09-30.endive），套件的 TypeScript 型別也只對應這個版本。
 * 注意：沒有 STRIPE_SECRET_KEY 時建構子會丟例外，import 這個檔案的 route 在 build 時就會失敗，
 * 所以每個會 build 的環境（本機 .env.production、Vercel）都要設定這個變數
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});
