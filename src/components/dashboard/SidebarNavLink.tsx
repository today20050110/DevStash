"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  /** true：只有路徑完全相同才算目前頁面（例如 /collections 不該在 /collections/[id] 時標示） */
  exact?: boolean;
  className?: string;
  children: ReactNode;
}

function isCurrentPath(pathname: string, href: string, exact: boolean) {
  return pathname === href || (!exact && pathname.startsWith(`${href}/`));
}

/** 側邊欄連結：目前頁面以 data-active 標示底色，並設 aria-current 給螢幕閱讀器 */
export function SidebarNavLink({
  href,
  exact = false,
  className,
  children,
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const active = isCurrentPath(pathname, href, exact);

  return (
    // 選中與 hover 的底色相同，左側再加一條線，才看得出是目前頁面
    <SidebarMenuButton
      asChild
      isActive={active}
      className={cn(
        "data-active:shadow-[inset_2px_0_0_var(--color-sidebar-foreground)]",
        className,
      )}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        {children}
      </Link>
    </SidebarMenuButton>
  );
}
