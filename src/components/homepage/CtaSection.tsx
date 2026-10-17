import { CtaLink } from "@/components/homepage/CtaLink";
import type { HomeLink } from "@/components/homepage/homepage-content";
import { Reveal } from "@/components/homepage/Reveal";

interface CtaSectionProps {
  start: HomeLink;
}

export function CtaSection({ start }: CtaSectionProps) {
  return (
    <section className="py-18 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="rounded-2xl border bg-card bg-radial-[at_top] from-home-url/20 to-transparent to-70% px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Organize Your Knowledge?
          </h2>
          <p className="mt-4 text-[17px] text-muted-foreground">
            Join developers who stopped searching and started shipping.
          </p>
          <CtaLink href={start.href} size="lg" className="mt-8">
            {start.label}
          </CtaLink>
        </Reveal>
      </div>
    </section>
  );
}
