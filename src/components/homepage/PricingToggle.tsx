"use client";

import { useState, type ReactNode } from "react";

import type { BillingPeriod } from "@/components/homepage/homepage-content";
import { cn } from "@/lib/utils";

const OPTIONS: { period: BillingPeriod; label: string }[] = [
  { period: "monthly", label: "Monthly" },
  { period: "yearly", label: "Yearly" },
];

interface PricingToggleProps {
  children: ReactNode;
  /** 受控模式（/upgrade 頁要知道選了哪個週期）；首頁不傳，由元件自己保存狀態 */
  period?: BillingPeriod;
  onPeriodChange?: (period: BillingPeriod) => void;
}

// 只負責切換狀態：價格卡片由 server 端渲染，兩種價格都在 HTML 裡，
// 以 data-period 搭配 group-data-[period=…]/pricing 決定顯示哪一個
export function PricingToggle({
  children,
  period: controlledPeriod,
  onPeriodChange,
}: PricingToggleProps) {
  const [uncontrolledPeriod, setUncontrolledPeriod] =
    useState<BillingPeriod>("monthly");
  const period = controlledPeriod ?? uncontrolledPeriod;
  const setPeriod = onPeriodChange ?? setUncontrolledPeriod;

  return (
    <div data-period={period} className="group/pricing">
      <div className="mb-14 flex justify-center">
        <div
          role="group"
          aria-label="Billing period"
          className="inline-flex gap-1 rounded-full border bg-card p-1"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.period}
              type="button"
              aria-pressed={period === option.period}
              onClick={() => setPeriod(option.period)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4.5 py-2 text-sm font-medium transition-colors",
                period === option.period
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              {option.period === "yearly" && (
                <span className="rounded-full bg-home-note/12 px-2 text-[11px] font-semibold text-home-note">
                  Save 25%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
