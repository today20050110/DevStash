/** 使用者輸入的網址只接受 http(s)：javascript: 等其他 scheme 放進 href 會執行程式碼 */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
