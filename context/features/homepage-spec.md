# Homepage

## Overview

Turn the static mockup in `prototypes/homepage/` (`index.html`, `styles.css`, `script.js`) into the real marketing homepage at `/`, replacing the current `redirect("/dashboard")` in `src/app/page.tsx`. Match the mockup's layout, copy, colors and animations; rebuild it with the project's stack rather than porting the HTML/CSS as-is.

## Requirements

### Page & routing

- `src/app/page.tsx` renders the homepage for everyone (no redirect); public route, not added to the `proxy.ts` matcher
- Call `auth()` once in the page to get `isSignedIn` and pass it down; with the JWT session strategy this reads the cookie only, no database query. It makes the page dynamic, which is fine
- Page `metadata`: title and description taken from the mockup's `<head>`
- Keep `prototypes/homepage/` as the visual reference

### Components

Put everything in `src/components/homepage/`. Server components by default; `'use client'` only where the mockup has interactivity:

| Component | Type | Notes |
| --- | --- | --- |
| `HomeNav` | client | Fixed top nav; background gets more opaque after scrolling |
| `HeroSection` | server | Headline, subheadline, CTAs, then the chaos → arrow → dashboard row |
| `ChaosField` | client | 8 floating icons using `requestAnimationFrame`: drift, bounce off walls, rotate and pulse in scale, move away from the cursor; pause when off-screen; render static icons when `prefers-reduced-motion` is set |
| `DashboardPreview` | server | Static mini dashboard: sidebar plus a grid of cards with colored top borders |
| `FeaturesSection` | server | 6 feature cards, rendered from a data array |
| `AiSection` | server | Pro badge, checklist, editor mockup with AI tags |
| `PricingSection` | server | Section shell and Free card |
| `PricingToggle` | client | Monthly/yearly switch; Pro card shows `$8/month` or `$72/year` |
| `CtaSection` | server | Final call to action |
| `HomeFooter` | server | Logo, link columns, copyright with the current year |
| `Reveal` | client | Fade-in-on-scroll wrapper (IntersectionObserver, fires once); reused by every section |

- Keep the client pieces small: interactive leaves wrapped by server components, not whole sections turned into client components
- Keep the pulsing arrow animation CSS-only (no JS)

### Styling

- Tailwind v4 utilities and shadcn/ui (`Button`, `Badge`, `Card` where they fit); no new CSS files and no inline `style` attributes, except the per-frame `transform` that `ChaosField` writes to each icon
- Custom keyframes (arrow pulse) and any homepage-only tokens go in `globals.css` under `@theme`
- Use the mockup's type palette, **not** the app's item type colors (agreed while building the mockup): Snippet `#3b82f6`, Prompt `#f59e0b`, Command `#06b6d4`, Note `#22c55e`, File `#64748b`, Image `#ec4899`, URL `#6366f1`
- Icons come from `lucide-react`. For brand logos that lucide lacks (Notion, Slack, VS Code), use small inline SVG components like the existing `GitHubIcon`
- Responsive behavior matches the mockup: on mobile the chaos/arrow/dashboard row stacks vertically, the arrow rotates 90° to point down, grids become one column, and the nav hides the text links

### Keep it DRY

- All copy and data live in one module, `src/components/homepage/homepage-content.ts`: nav links, feature cards, AI checklist, plan features and prices, footer columns, chaos icons, dashboard preview items. Components map over these arrays instead of repeating markup
- Define the type palette once and reference it by key (e.g. `accent: "prompt"`); don't scatter hex values across components
- Shared bits that appear more than once (logo lockup, section heading with eyebrow, checklist item) get one component each

### Links & buttons

Every link goes to a real destination. Drop the mockup's placeholder `#` links:

| Element | Signed out | Signed in |
| --- | --- | --- |
| Logo | `/` | `/` |
| Nav Features / Pricing | `#features` / `#pricing` (smooth scroll, offset for the fixed nav) | same |
| Nav buttons | Sign In → `/sign-in`, Get Started → `/register` | Single "Dashboard" → `/dashboard` |
| Hero primary CTA | Get Started Free → `/register` | Go to Dashboard → `/dashboard` |
| Hero secondary CTA | See Features → `#features` | same |
| Free plan button | `/register` | `/dashboard` |
| Pro plan button | `/register` | `/dashboard` (no Stripe yet; point it at checkout once billing exists) |
| Final CTA | `/register` | `/dashboard` |
| Footer | Product: Features, AI, Pricing (anchors); Account: Sign In, Get Started, or Dashboard when signed in | same |

- Use `next/link` for internal routes and plain anchors for in-page hashes
- Derive the signed-in/signed-out variants from one helper or config, so the same condition isn't repeated in every component

## Testing

- No unit tests: this feature touches only components and pages, which per the coding standards are out of scope for tests. Only add a test if a helper ends up in `src/lib/`
- Verify in the browser at desktop and mobile widths, both signed out and signed in: every link's destination, chaos animation and cursor avoidance, pricing toggle, nav opacity, scroll reveal, no horizontal scroll, no console errors
- Run `npm test` and `npm run build`
