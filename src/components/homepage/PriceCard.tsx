import type { ReactNode } from "react";

import { CheckList } from "@/components/homepage/CheckList";
import { CtaLink } from "@/components/homepage/CtaLink";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PriceCardProps {
  name: string;
  price: ReactNode;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}

export function PriceCard({ name, price, features, cta, href, featured = false }: PriceCardProps) {
  return (
    <Card
      className={cn(
        "relative h-full gap-0 overflow-visible p-8",
        featured &&
          "bg-linear-to-b from-home-url/10 to-card to-45% shadow-2xl shadow-home-url/25 ring-home-url",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-home-url px-3.5 py-0.5 text-xs font-semibold whitespace-nowrap text-white">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-semibold">{name}</h3>
      {price}
      <CheckList items={features} className="mt-7 mb-8 flex-1 content-start" />
      <CtaLink href={href} variant={featured ? "primary" : "outline"} className="w-full">
        {cta}
      </CtaLink>
    </Card>
  );
}

interface PriceProps {
  price: string;
  period: string;
  note: string;
  className?: string;
}

export function Price({ price, period, note, className }: PriceProps) {
  return (
    <div className={cn("mt-4", className)}>
      <p className="flex items-baseline gap-1">
        <span className="text-[44px] font-extrabold tracking-tight">{price}</span>
        <span className="text-muted-foreground">{period}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground/70">{note}</p>
    </div>
  );
}
