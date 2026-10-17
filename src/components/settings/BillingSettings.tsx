"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// usage.ts 會帶進 Prisma，client 元件改從沒有相依的 plan.ts 取上限
import { FREE_COLLECTION_LIMIT, FREE_ITEM_LIMIT } from "@/lib/plan";

interface BillingSettingsProps {
  isPro: boolean;
  itemCount: number;
  collectionCount: number;
  /** 從 Stripe Checkout 回來（/settings?upgraded=true）；由頁面讀 searchParams 傳入 */
  upgraded: boolean;
}

type PendingAction = "monthly" | "yearly" | "portal";

const UPGRADED_TOAST_ID = "upgraded";

/** POST 到 Stripe 的 API route，成功時導向回傳的網址；失敗時回傳錯誤訊息 */
async function redirectToStripe(
  path: string,
  body?: object,
): Promise<string | null> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
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

export function BillingSettings({
  isPro,
  itemCount,
  collectionCount,
  upgraded,
}: BillingSettingsProps) {
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (!upgraded) {
      return;
    }
    // 固定 id：開發模式的 StrictMode 會執行兩次 effect，同一個 id 只顯示一則
    toast.success("Welcome to DevStash Pro!", { id: UPGRADED_TOAST_ID });
    window.history.replaceState({}, "", "/settings");
  }, [upgraded]);

  async function run(action: PendingAction) {
    setPending(action);
    const error =
      action === "portal"
        ? await redirectToStripe("/api/stripe/portal")
        : await redirectToStripe("/api/stripe/checkout", { plan: action });
    // 成功時頁面正在導向 Stripe，維持 loading 直到離開
    if (error) {
      toast.error(error);
      setPending(null);
    }
  }

  function spinnerFor(action: PendingAction) {
    return pending === action ? <Loader2 className="animate-spin" /> : null;
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <CreditCard className="size-5" aria-hidden />
        Billing
      </h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan
            <Badge variant={isPro ? "default" : "secondary"}>
              {isPro ? "Pro" : "Free"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isPro
              ? "Unlimited items, collections and file uploads."
              : "Upgrade for unlimited items and collections, plus file and image uploads."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPro && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-lg border px-3 py-2">
                <dt className="text-muted-foreground">Items</dt>
                <dd className="font-medium">
                  {itemCount}/{FREE_ITEM_LIMIT} items
                </dd>
              </div>
              <div className="flex justify-between rounded-lg border px-3 py-2">
                <dt className="text-muted-foreground">Collections</dt>
                <dd className="font-medium">
                  {collectionCount}/{FREE_COLLECTION_LIMIT} collections
                </dd>
              </div>
            </dl>
          )}
          <div className="flex flex-wrap gap-2">
            {isPro ? (
              <Button
                variant="outline"
                disabled={pending !== null}
                onClick={() => run("portal")}
              >
                {spinnerFor("portal")}
                Manage Billing
              </Button>
            ) : (
              <>
                <Button
                  disabled={pending !== null}
                  onClick={() => run("monthly")}
                >
                  {spinnerFor("monthly")}
                  Upgrade $8/mo
                </Button>
                <Button
                  variant="outline"
                  disabled={pending !== null}
                  onClick={() => run("yearly")}
                >
                  {spinnerFor("yearly")}
                  Upgrade $72/yr (save 25%)
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
