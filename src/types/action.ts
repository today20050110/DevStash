/**
 * server action 與 API route 共用的回應格式（coding-standards 的 { success, data, error }）。
 * 不帶 data 的回應（例如刪除）用預設的 never
 */
export interface ActionResult<T = never> {
  success: boolean;
  data?: T;
  error?: string;
}
