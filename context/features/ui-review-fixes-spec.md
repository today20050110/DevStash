# UI Review Fixes

## Overview

Fix the top findings from the ui-reviewer pass (2026-10-18; screenshots in `.playwright-mcp/ui-review/`, which is gitignored): item cards squeeze their text into a narrow column, touch targets are too small on phones, and content width differs between pages. Also fix a nested `<main>` landmark found while verifying the report.

## Requirements

### 1. Item card layout (high)

`src/components/dashboard/ItemCard.tsx` puts the icon tile, the text column, the date, the favorite button and the copy button in one flex row. The fixed-width siblings leave the text column about **99px** wide in a ~340px card (measured at 1366px, 3-column grid). Titles truncate to "useDebou…", and descriptions wrap 2–3 words per line while the right half of the card is empty. At 375px titles shrink to "use…" and descriptions wrap almost one word per line.

- Restructure the card into two parts:
  - **Header row:** type icon tile, title (with `ItemStatusIcons`), then on the right the date, `FavoriteButton` and `CopyItemButton`
  - **Body below it, full card width:** description and tags
- Title: allow up to 2 lines (`line-clamp-2`) instead of single-line `truncate`. The header row keeps the actions top-aligned when the title wraps
- Below `sm`, hide the date if the header row is still too tight. Measure first; the date is also shown in the drawer
- Keep the existing behavior: the whole card opens the drawer (`ItemCardTrigger` overlay), the buttons sit above the overlay, the left border uses the type color, and the copy button only renders when `hasCopyValue`
- After the restructure, measure the title width at 1366px with the current grid (`@3xl:grid-cols-2 @5xl:grid-cols-3` in `ItemGrid.tsx`). Only if titles are still under ~160px, raise the 3-column breakpoint (e.g. `@6xl`)
- `ImageCard` is out of scope

### 2. Touch targets on phones (medium)

Measured at 375px: the item card favorite and copy buttons, "Toggle Sidebar" and the drawer close/delete buttons are 28×28px; the drawer action buttons (Favorite, Pin, Copy, Edit) are 28px tall; the code block "Copy code" button is 24×24px.

- Add one utility in `globals.css`, e.g. `@utility hit-area`, that enlarges the clickable area to at least 40×40px with an invisible `::before` (`absolute`, centered, negative inset) and leaves the visual size unchanged
- Apply it only on coarse pointers (`pointer-coarse:` variant), so desktop spacing and hover areas stay the same
- Apply it to:
  - `FavoriteButton` (icon variant) and `CopyItemButton`
  - Drawer action buttons and close/delete (`ItemDrawerActions.tsx`, `PinButton.tsx`, `ItemDrawer.tsx`)
  - The "Copy code" button in `CodeEditor.tsx`
  - The top bar `SidebarTrigger`: pass a class from `Topbar.tsx`, don't edit `src/components/ui/sidebar.tsx`
- Enlarged hit areas of neighboring buttons must not overlap in a way that makes one unreachable. Where buttons sit closer than the enlargement, widen the gap on coarse pointers instead (e.g. the favorite/copy pair on cards)
- Out of scope: Settings switches and text links ("View all")

### 3. Page content width (medium; decision)

Measured at 1366px: `/dashboard`, `/items/*` and `/collections` fill the content area (right edge ≈ 1320–1334px). `/profile`, `/settings` and `/favorites` are capped at `max-w-4xl` (right edge 1184px). The reviewer reported `/settings` as full width; it is actually capped too.

- **Decision: keep the two widths.** Grid pages stay full width. Reading and form pages (Profile, Settings, Favorites list) stay at `max-w-4xl`, because long form rows and dense list rows are harder to scan at ~1080px
- Make the choice explicit instead of repeating `max-w-4xl` in three pages: add a shared constant or small wrapper (e.g. `NARROW_PAGE_CLASS` in `src/lib/`, or a `PageContainer` component) and use it in the three pages
- If you'd rather unify everything to full width, change this section before starting

### 4. Nested `<main>` landmark (low; found while verifying)

shadcn's `SidebarInset` renders a `<main>`, and `src/app/(app)/layout.tsx` renders another `<main>` inside it, so every app page has two nested `main` landmarks.

- Change the inner element in `layout.tsx` to a `<div>` with the same classes. Don't edit `sidebar.tsx`

## Out of scope

- Reviewer items 4–7: drawer action crowding beyond the hit areas above, Sign In in the mobile homepage nav, a multi-column image grid at 768px, and the Notes empty state
- Any homepage changes

## Testing

- No unit tests, unless the shared width constant/helper ends up in `src/lib/` with logic worth testing (a plain string constant doesn't need one)
- Playwright at 375, 768 and 1366px:
  - Item cards on `/items/snippets`, `/items/commands`, `/items/links` and a `/collections/[id]` page: title is readable (measure its width), description uses the full card width, actions are still clickable, and clicking elsewhere on the card still opens the drawer
  - With touch emulation (coarse pointer): measure the hit areas (≥ 40px) of the buttons listed in section 2, and check that each neighbor is still clickable
  - Desktop (fine pointer): button sizes and spacing unchanged
  - Only one `main` landmark per page
  - No horizontal scroll and no console errors
- Run `npm test` and `npm run build`
