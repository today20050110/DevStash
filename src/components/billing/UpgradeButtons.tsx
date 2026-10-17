"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStripeRedirect, type StripeAction } from "@/hooks/use-stripe-redirect";
import { cn } from "@/lib/utils";

/** 月付／年付升級按鈕；Settings 的 Billing 與 Pro 限定頁面的升級頁共用 */
export function UpgradeButtons({ className }: { className?: string }) {
  const { pending, run } = useStripeRedirect();

  function spinnerFor(action: StripeAction) {
    return pending === action ? <Loader2 className="animate-spin" /> : null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button disabled={pending !== null} onClick={() => run("monthly")}>
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
    </div>
  );
}
