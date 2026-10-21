"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  FREE_PLAN,
  PRO_PLAN,
  type BillingPeriod,
} from "@/components/homepage/homepage-content";
import { Price, PriceCard } from "@/components/homepage/PriceCard";
import { PricingToggle } from "@/components/homepage/PricingToggle";
import { Button } from "@/components/ui/button";
import { useStripeRedirect } from "@/hooks/use-stripe-redirect";

/** /upgrade 頁的方案比較：與首頁 pricing 相同的卡片，選好週期後由 Pro 卡片的按鈕進入 Checkout */
export function UpgradePlans() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const { pending, run } = useStripeRedirect();
  const proPrice = PRO_PLAN.prices[period];

  return (
    <PricingToggle period={period} onPeriodChange={setPeriod}>
      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <PriceCard
          name={FREE_PLAN.name}
          price={
            <Price
              price={FREE_PLAN.price}
              period={FREE_PLAN.period}
              note={FREE_PLAN.note}
            />
          }
          features={FREE_PLAN.features}
          action={
            <Button variant="outline" disabled className="h-9 w-full">
              Current plan
            </Button>
          }
        />
        <PriceCard
          featured
          name={PRO_PLAN.name}
          price={<Price {...proPrice} />}
          features={PRO_PLAN.features}
          action={
            <Button
              disabled={pending !== null}
              onClick={() => run(period)}
              className="h-9 w-full bg-home-url text-white hover:bg-home-url/85"
            >
              {pending && <Loader2 className="animate-spin" />}
              Upgrade for {proPrice.price}
              {proPrice.period}
            </Button>
          }
        />
      </div>
    </PricingToggle>
  );
}
