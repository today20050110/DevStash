import type { EditorPreferences } from "@/lib/editor-preferences";

export interface CurrentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  /** 有效的 Pro 訂閱（plan.ts 的 isPro）；與帳號一起查出，layout 不必再查一次 User */
  isPro: boolean;
  /** 已補上預設值；layout 傳給 EditorPreferencesProvider */
  editorPreferences: EditorPreferences;
}

export interface UserProfile extends Omit<
  CurrentUser,
  "isPro" | "editorPreferences"
> {
  createdAt: Date;
  /** 以帳號密碼註冊：才顯示變更密碼 */
  hasPassword: boolean;
}
