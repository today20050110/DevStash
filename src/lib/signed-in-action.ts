import {
  GENERIC_ERROR_MESSAGE,
  NOT_SIGNED_IN_MESSAGE,
} from "@/lib/action-errors";
import { getCurrentUserId } from "@/lib/current-user";

interface SignedInFailure {
  success: false;
  error: string;
}

/**
 * server action 共用的外框：取目前使用者的 id 後執行 run。
 * getCurrentUserId() 回查資料庫並比對 sessionVersion，重設密碼後的舊 token 會被擋下；
 * 未登入回 NOT_SIGNED_IN_MESSAGE，未預期的例外記下 logLabel 並回 GENERIC_ERROR_MESSAGE。
 * 不放進 action-errors.ts：那個檔案也被 client 元件 import，這裡會帶進 auth 與 Prisma
 */
export async function withSignedInUser<R>(
  logLabel: string,
  run: (userId: string) => Promise<R>,
): Promise<R | SignedInFailure> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return { success: false, error: NOT_SIGNED_IN_MESSAGE };
    }
    return await run(userId);
  } catch (error) {
    console.error(logLabel, error);
    return { success: false, error: GENERIC_ERROR_MESSAGE };
  }
}
