import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CtaVariant = "primary" | "outline" | "ghost";

interface CtaLinkProps {
  href: string;
  variant?: CtaVariant;
  size?: "default" | "lg";
  className?: string;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<CtaVariant, string> = {
  primary: "bg-home-url text-white hover:bg-home-url/85",
  outline: "",
  ghost: "text-muted-foreground",
};

const SIZE_CLASSES = {
  default: "h-9 px-4",
  lg: "h-11 px-5 text-[15px]",
};

// 頁內錨點用原生 <a>（交給瀏覽器平滑捲動），站內路由用 next/link
export function CtaLink({ href, variant = "primary", size = "default", className, children }: CtaLinkProps) {
  const isHash = href.startsWith("#");
  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : variant}
      className={cn(SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
    >
      {isHash ? <a href={href}>{children}</a> : <Link href={href}>{children}</Link>}
    </Button>
  );
}
