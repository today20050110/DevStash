import { apiError } from "@/lib/api-response";
import { getCurrentUserId } from "@/lib/current-user";
import { getItemFile } from "@/lib/db/items";
import { contentDisposition } from "@/lib/file-types";
import { getObjectStream } from "@/lib/r2";
import { checkRateLimit, rateLimitMessage } from "@/lib/rate-limit";

/**
 * 檔案下載與圖片預覽的代理：驗證登入與擁有者後由伺服器向 R2 讀取並轉送，
 * bucket 不必公開也不必對瀏覽器開放 GET 的 CORS。
 *
 * 內容是使用者上傳的任意資料（SVG 可內嵌 script、副檔名可以亂取），回應一律：
 * - Content-Type 用資料庫記錄的值，加 nosniff 不讓瀏覽器自行猜測
 * - Content-Disposition: attachment，直接開啟網址時下載而不是在本站渲染；
 *   <img> 不受 attachment 影響，drawer 的預覽照常顯示
 * - CSP sandbox，即使被當成文件開啟也不能執行 script 或存取本站 cookie
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/items/[id]/file">,
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return apiError("Unauthorized", 401);
  }
  const limit = await checkRateLimit("downloadFile", userId);
  if (!limit.success) {
    return apiError(rateLimitMessage(limit.reset), 429);
  }

  const { id } = await params;
  try {
    const file = await getItemFile(userId, id);
    // 別人的、已刪除的與沒有檔案的 item 一樣回 404
    if (!file) {
      return apiError("File not found", 404);
    }
    const body = await getObjectStream(file.storageKey);
    if (!body) {
      return apiError("File not found", 404);
    }
    return new Response(body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": contentDisposition(file.name),
        "X-Content-Type-Options": "nosniff",
        // 只用 sandbox（不加 default-src 'none'）：CSP 也套用在 <img> 載入的 SVG 上，
        // 擋掉它內部的 <style> 會讓預覽變形；sandbox 不含 allow-scripts 已足以禁止 script
        "Content-Security-Policy": "sandbox",
        // 每個 item 的檔案建立後不會更換；private 避免共用快取保留別人的檔案
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Failed to load file", error);
    return apiError("Failed to load file", 500);
  }
}
