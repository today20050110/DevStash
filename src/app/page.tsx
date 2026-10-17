import type { Metadata } from "next";

import { auth } from "@/auth";
import { AiSection } from "@/components/homepage/AiSection";
import { CtaSection } from "@/components/homepage/CtaSection";
import { FeaturesSection } from "@/components/homepage/FeaturesSection";
import { HeroSection } from "@/components/homepage/HeroSection";
import { HomeFooter } from "@/components/homepage/HomeFooter";
import { HomeNav } from "@/components/homepage/HomeNav";
import { getHomeLinks, NAV_SECTION_LINKS } from "@/components/homepage/homepage-content";
import { PricingSection } from "@/components/homepage/PricingSection";

export const metadata: Metadata = {
  title: "DevStash — Your Developer Knowledge Hub",
  description:
    "DevStash keeps your snippets, AI prompts, commands, notes, files, images and links in one fast, searchable place.",
};

// JWT session：auth() 只讀 cookie、不查資料庫
export default async function Home() {
  const session = await auth();
  const links = getHomeLinks(Boolean(session?.user));

  return (
    <>
      <HomeNav actions={links.navActions} sectionLinks={NAV_SECTION_LINKS} />
      <main className="[:root:has(&)]:scroll-smooth">
        <HeroSection start={links.start} />
        <FeaturesSection />
        <AiSection />
        <PricingSection planHref={links.planHref} />
        <CtaSection start={links.start} />
      </main>
      <HomeFooter account={links.account} />
    </>
  );
}
