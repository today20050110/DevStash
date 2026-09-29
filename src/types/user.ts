export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface UserProfile extends CurrentUser {
  createdAt: Date;
  /** 以帳號密碼註冊：才顯示變更密碼 */
  hasPassword: boolean;
}
