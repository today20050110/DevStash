import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface BrandIconProps {
  className?: string;
}

// lucide-react 不提供品牌圖示；首頁 chaos 區只需辨識度，以簡化的線條 mark 呈現
function StrokeIcon({ className, children }: BrandIconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn(
        "size-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]",
        className,
      )}
    >
      {children}
    </svg>
  );
}

export function NotionIcon({ className }: BrandIconProps) {
  return (
    <StrokeIcon className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8.5 16.5v-9l7 9v-9" />
    </StrokeIcon>
  );
}

export function SlackIcon({ className }: BrandIconProps) {
  return (
    <StrokeIcon className={className}>
      <rect x="13" y="2" width="3" height="8" rx="1.5" />
      <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5" />
      <rect x="8" y="14" width="3" height="8" rx="1.5" />
      <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5" />
      <rect x="14" y="13" width="8" height="3" rx="1.5" />
      <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5" />
      <rect x="2" y="8" width="8" height="3" rx="1.5" />
      <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5" />
    </StrokeIcon>
  );
}

export function VSCodeIcon({ className }: BrandIconProps) {
  return (
    <StrokeIcon className={className}>
      <path d="M16.5 2.5 21 4.8v14.4l-4.5 2.3L3.5 9.2 6 7.5l10.5 9.3V7.2L6 16.5l-2.5-1.7 13-12.3Z" />
    </StrokeIcon>
  );
}
