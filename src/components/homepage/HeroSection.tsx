import { ArrowRight } from "lucide-react";

import { ChaosField } from "@/components/homepage/ChaosField";
import { CtaLink } from "@/components/homepage/CtaLink";
import { DashboardPreview } from "@/components/homepage/DashboardPreview";
import { HeroPanel } from "@/components/homepage/HeroPanel";
import type { HomeLink } from "@/components/homepage/homepage-content";
import { Reveal } from "@/components/homepage/Reveal";

interface HeroSectionProps {
  start: HomeLink;
}

export function HeroSection({ start }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-28 pb-22 md:pt-34">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-50 h-150 bg-radial from-home-url/20 to-transparent to-65%"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Stop Losing Your
            <span className="block bg-[linear-gradient(90deg,var(--color-home-snippet),var(--color-home-url)_40%,var(--color-home-image)_75%,var(--color-home-prompt))] bg-clip-text pb-1 text-transparent">
              Developer Knowledge
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Your snippets live in VS Code, your prompts in chat history, your commands in bash
            history and your links in a hundred browser tabs. DevStash brings them into one fast,
            searchable hub.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CtaLink href={start.href} size="lg">
              {start.label}
            </CtaLink>
            <CtaLink href="#features" variant="outline" size="lg">
              See Features
            </CtaLink>
          </div>
        </Reveal>

        <Reveal className="mt-16 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6">
          <HeroPanel label="Your knowledge today...">
            <ChaosField />
          </HeroPanel>
          <div
            aria-hidden="true"
            className="grid size-14 rotate-90 place-items-center justify-self-center rounded-full border border-home-url/40 bg-home-url/12 text-home-url animate-arrow-pulse motion-reduce:animate-none md:rotate-0"
          >
            <ArrowRight className="size-7" />
          </div>
          <HeroPanel label="...with DevStash">
            <DashboardPreview />
          </HeroPanel>
        </Reveal>
      </div>
    </section>
  );
}
