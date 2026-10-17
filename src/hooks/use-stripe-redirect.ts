"use client";

import { useState } from "react";
import { toast } from "sonner";

export type StripeAction = "monthly" | "yearly" | "portal";

/** POST 到 Stripe 的 API route，成功時導向回傳的網址；失敗時回傳錯誤訊息 */
async function redirectToStripe(action: StripeAction): Promise<string | null> {
  const isPortal = action === "portal";
  try {
    const response = await fetch(
      isPortal ? "/api/stripe/portal" : "/api/stripe/checkout",
      {
        method: "POST",
        headers: isPortal ? undefined : { "content-type": "application/json" },
        body: isPortal ? undefined : JSON.stringify({ plan: action }),
      },
    );
    const data: { url?: string; error?: string } = await response
      .json()
      .catch(() => ({}));
    if (!response.ok || !data.url) {
      return data.error ?? "Something went wrong, please try again";
    }
    window.location.href = data.url;
    return null;
  } catch {
    return "Couldn't reach the server. Check your connection and try again.";
  }
}

/**
 * 導向 Stripe Checkout（月付／年付）或 Customer Portal。
 * pending 是進行中的動作；成功時頁面正在離開，維持 pending 直到導向完成
 */
export function useStripeRedirect() {
  const [pending, setPending] = useState<StripeAction | null>(null);

  async function run(action: StripeAction) {
    setPending(action);
    const error = await redirectToStripe(action);
    if (error) {
      toast.error(error);
      setPending(null);
    }
  }

  return { pending, run };
}
