"use client";

import { useEffect } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { UpgradeButtons } from "@/components/billing/UpgradeButtons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStripeRedirect } from "@/hooks/use-stripe-redirect";
// usage.ts 會帶進 Prisma，client 元件改從沒有相依的 plan.ts 取上限
import {
  AI_DAILY_LIMIT,
  FREE_COLLECTION_LIMIT,
  FREE_ITEM_LIMIT,
} from "@/lib/plan";

interface BillingSettingsProps {
  isPro: boolean;
  itemCount: number;
  collectionCount: number;
  /** 過去 24 小時的 AI 呼叫次數（只對 Pro 顯示） */
  aiRequestCount: number;
  /** 從 Stripe Checkout 回來（/settings?upgraded=true）；由頁面讀 searchParams 傳入 */
  upgraded: boolean;
}

const UPGRADED_TOAST_ID = "upgraded";

/** Pro 使用者的 Customer Portal 按鈕 */
function ManageBillingButton() {
  const { pending, run } = useStripeRedirect();
  return (
    <Button
      variant="outline"
      disabled={pending !== null}
      onClick={() => run("portal")}
    >
      {pending === "portal" && <Loader2 className="animate-spin" />}
      Manage Billing
    </Button>
  );
}

export function BillingSettings({
  isPro,
  itemCount,
  collectionCount,
  aiRequestCount,
  upgraded,
}: BillingSettingsProps) {
  useEffect(() => {
    if (!upgraded) {
      return;
    }
    // 固定 id：開發模式的 StrictMode 會執行兩次 effect，同一個 id 只顯示一則
    toast.success("Welcome to DevStash Pro!", { id: UPGRADED_TOAST_ID });
    window.history.replaceState({}, "", "/settings");
  }, [upgraded]);

  return (
    <section id="billing" className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <CreditCard className="size-5" aria-hidden />
        Billing
      </h2>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan
            {isPro ? (
              <Badge className="border-primary/30 bg-primary/15 text-foreground">
                Pro
              </Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
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
          {isPro && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between rounded-lg border px-3 py-2">
                <dt className="text-muted-foreground">AI requests today</dt>
                <dd className="font-medium">
                  {aiRequestCount}/{AI_DAILY_LIMIT}
                </dd>
              </div>
            </dl>
          )}
          {isPro ? <ManageBillingButton /> : <UpgradeButtons />}
        </CardContent>
      </Card>
    </section>
  );
}
