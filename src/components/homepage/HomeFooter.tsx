import { HomeAnchor } from "@/components/homepage/HomeAnchor";
import { SECTION_LINKS, type HomeLink } from "@/components/homepage/homepage-content";
import { Logo } from "@/components/homepage/Logo";

interface HomeFooterProps {
  account: HomeLink[];
}

function FooterColumn({ title, links }: { title: string; links: HomeLink[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h4 className="mb-1 text-[13px] font-semibold">{title}</h4>
      {links.map((link) => (
        <HomeAnchor
          key={link.href}
          href={link.href}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {link.label}
        </HomeAnchor>
      ))}
    </div>
  );
}

export function HomeFooter({ account }: HomeFooterProps) {
  return (
    <footer className="border-t pt-14 pb-8 text-sm">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 sm:grid-cols-[2fr_1fr_1fr] sm:px-6">
        <div className="col-span-2 sm:col-span-1">
          <Logo />
          <p className="mt-3 max-w-72 text-muted-foreground">
            The developer knowledge hub for snippets, prompts, commands and more.
          </p>
        </div>
        <FooterColumn title="Product" links={SECTION_LINKS} />
        <FooterColumn title="Account" links={account} />
      </div>
      <div className="mx-auto mt-12 max-w-6xl px-4 sm:px-6">
        <p className="border-t pt-6 text-muted-foreground/70">
          &copy; {new Date().getFullYear()} DevStash. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
