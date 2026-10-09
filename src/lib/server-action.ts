/** 原因可能是網路，也可能是內容超過 body 上限（重試沒用），所以兩者都提到 */
export const SERVER_UNREACHABLE_MESSAGE =
  "The request couldn't be completed. Check your connection, or shorten very large content, then try again.";

/**
 * 從 client 呼叫 server action。action 內的 try/catch 只處理伺服器端的錯誤；
 * 網路中斷、平台 5xx、部署後舊分頁的 action ID 失效、request body 超過
 * serverActions.bodySizeLimit 時，promise 本身會 reject。在 transition 裡沒接住的話
 * 會一路丟到 error boundary，整頁變成錯誤畫面、表單內容消失，所以這裡改成回傳 null。
 */
export async function callServerAction<T>(
  action: () => Promise<T>,
): Promise<T | null> {
  try {
    return await action();
  } catch (error) {
    console.error("Server action failed", error);
    return null;
  }
}
