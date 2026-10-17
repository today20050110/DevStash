import Link from "next/link";
import type { ReactNode } from "react";

interface HomeAnchorProps {
  href: string;
  className?: string;
  children: ReactNode;
}

/** 頁內錨點（#features）用原生 <a> 交給瀏覽器捲動；其他網址（含 /#features）用 next/link */
export function HomeAnchor({ href, className, children }: HomeAnchorProps) {
  return href.startsWith("#") ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
