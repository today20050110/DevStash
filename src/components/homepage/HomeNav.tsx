"use client";

import { useEffect, useState } from "react";

import { CtaLink } from "@/components/homepage/CtaLink";
import { HomeAnchor } from "@/components/homepage/HomeAnchor";
import type { HomeLink, NavAction } from "@/components/homepage/homepage-content";
import { Logo } from "@/components/homepage/Logo";
import { cn } from "@/lib/utils";

interface HomeNavProps {
  actions: NavAction[];
  /** 首頁傳 #features 等頁內錨點；其他頁傳 /#features 連回首頁 */
  sectionLinks: HomeLink[];
}

export function HomeNav({ actions, sectionLinks }: HomeNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md transition-colors duration-300",
        scrolled ? "border-border bg-background/90" : "border-transparent bg-background/35",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden gap-6 text-sm text-muted-foreground md:flex">
          {sectionLinks.map((link) => (
            <HomeAnchor
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </HomeAnchor>
          ))}
        </nav>
        <div className="ml-auto flex gap-2">
          {actions.map((action) => (
            <CtaLink
              key={action.label}
              href={action.href}
              variant={action.variant}
              className={cn(action.variant === "ghost" && "hidden md:inline-flex")}
            >
              {action.label}
            </CtaLink>
          ))}
        </div>
      </div>
    </header>
  );
}
