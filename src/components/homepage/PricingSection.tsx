import {
  FREE_PLAN,
  PRO_PLAN,
  type BillingPeriod,
} from "@/components/homepage/homepage-content";
import { Price, PriceCard } from "@/components/homepage/PriceCard";
import { PricingToggle } from "@/components/homepage/PricingToggle";
import { Reveal } from "@/components/homepage/Reveal";
import { SectionHeading } from "@/components/homepage/SectionHeading";

// 兩種計費週期的價格都會渲染，由 PricingToggle 的 data-period 決定顯示哪一個
const PERIOD_VISIBILITY: Record<BillingPeriod, string> = {
  monthly: "group-data-[period=yearly]/pricing:hidden",
  yearly: "hidden group-data-[period=yearly]/pricing:block",
};

const PERIODS = Object.keys(PRO_PLAN.prices) as BillingPeriod[];

interface PricingSectionProps {
  planHref: string;
}

export function PricingSection({ planHref }: PricingSectionProps) {
  return (
    <section id="pricing" className="scroll-mt-16 py-18 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Start free, upgrade when you outgrow it"
            className="mb-7"
          />
        </Reveal>
        <PricingToggle>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <Reveal>
              <PriceCard
                name={FREE_PLAN.name}
                price={
                  <Price price={FREE_PLAN.price} period={FREE_PLAN.period} note={FREE_PLAN.note} />
                }
                features={FREE_PLAN.features}
                cta={FREE_PLAN.cta}
                href={planHref}
              />
            </Reveal>
            <Reveal>
              <PriceCard
                featured
                name={PRO_PLAN.name}
                price={PERIODS.map((period) => (
                  <Price
                    key={period}
                    {...PRO_PLAN.prices[period]}
                    className={PERIOD_VISIBILITY[period]}
                  />
                ))}
                features={PRO_PLAN.features}
                cta={PRO_PLAN.cta}
                href={planHref}
              />
            </Reveal>
          </div>
        </PricingToggle>
      </div>
    </section>
  );
}
