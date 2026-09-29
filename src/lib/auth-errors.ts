import { CredentialsSignin } from "next-auth";

/**
 * 密碼正確但 email 尚未驗證。Credentials 的 authorize 只能回 null 或丟出
 * CredentialsSignin，以 code 區分才能在登入表單顯示重寄驗證信的入口。
 * 只在密碼驗證通過後丟出，不會向不知道密碼的人透露帳號狀態。
 */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

/**
 * 登入嘗試次數超過限制。在 authorize 裡丟出，server action 與直接呼叫
 * /api/auth/callback/credentials 都會經過。reset 帶到 server action 組出等待時間
 */
export class RateLimitedError extends CredentialsSignin {
  code = "rate_limited";

  constructor(readonly reset: number) {
    super();
  }
}
