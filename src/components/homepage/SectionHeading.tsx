import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, className }: SectionHeadingProps) {
  return (
    <header className={cn("mx-auto mb-14 max-w-2xl text-center", className)}>
      <p className="mb-3 text-[13px] font-semibold tracking-[0.12em] text-home-url uppercase">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-[17px] text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
