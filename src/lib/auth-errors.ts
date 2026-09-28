import { CredentialsSignin } from "next-auth";

/**
 * 密碼正確但 email 尚未驗證。Credentials 的 authorize 只能回 null 或丟出
 * CredentialsSignin，以 code 區分才能在登入表單顯示重寄驗證信的入口。
 * 只在密碼驗證通過後丟出，不會向不知道密碼的人透露帳號狀態。
 */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}
