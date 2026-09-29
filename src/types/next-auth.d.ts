import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** 簽發時的 User.sessionVersion；getCurrentUser() 與資料庫比對 */
      sessionVersion: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    /** 登入時由 auth.ts 的 jwt callback 寫入；這次上線前簽發的 token 沒有這個欄位 */
    sessionVersion?: number;
  }
}
