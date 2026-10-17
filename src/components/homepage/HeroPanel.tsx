import type { ReactNode } from "react";

interface HeroPanelProps {
  label: string;
  children: ReactNode;
}

export function HeroPanel({ label, children }: HeroPanelProps) {
  return (
    <figure className="m-0 flex h-80 flex-col rounded-xl border bg-card p-4 shadow-2xl shadow-black/40 md:h-90">
      <figcaption className="mb-3 text-[13px] font-medium text-muted-foreground">{label}</figcaption>
      {children}
    </figure>
  );
}
