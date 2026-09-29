// 同名參數重複出現時（?email=a&email=b）只取第一個
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// 在連到另一個驗證頁時帶上已知的 email，省去重打
export function withEmailParam(path: string, email: string): string {
  return email ? `${path}?${new URLSearchParams({ email })}` : path;
}
