# Topbar Mobile

## Overview

The dashboard top bar (`src/components/dashboard/Topbar.tsx`) is cluttered on small screens and causes horizontal scrolling at some widths. Fix the overflow and slim the bar down to icon buttons on phones. Keep the tablet/desktop layout as it is today.

Findings from Playwright (2026-10-17):

| Width | Problem |
| --- | --- |
| 320px | Page scrolls horizontally by ~40px; "New Item" is cut off |
| 375–430px | "Search items..." wraps to two lines next to an unused `Ctrl K` hint |
| < 640px | "New Collection" is hidden (`hidden sm:inline-flex`), so phones have no way to create a collection |
| 768px | Desktop sidebar takes 256px but the header stays 726px wide, so the page scrolls horizontally by ~230px and "New Item" is off-screen |

Root cause at 768px: `SidebarInset` is a flex child without `min-w-0`, so it won't shrink. Adding `min-w-0` in DevTools brought the page width from 982px back to 768px.

## Requirements

### 1. Fix the overflow (bug)

- Add `min-w-0` to `<SidebarInset>` in `src/app/(app)/layout.tsx`
- `SearchButton`: add `min-w-0` and truncate the label (`truncate`) so it never wraps
- No horizontal page scroll at any width from 320px up

### 2. Search collapses to an icon below `sm`

- Below `sm`, `SearchButton` renders as an icon-only button (magnifier, `aria-label="Search"`, same size as the other icon buttons) that opens the command palette
- From `sm` up, keep the current input-style button
- Hide the `⌘ K` / `Ctrl K` hint below `md`; touch devices have no keyboard
- The `⌘K` / `Ctrl+K` shortcut keeps working at every width

### 3. One "+" menu for creating things below `sm`

- New client component `TopbarActions` holds the open state of both dialogs and renders the create triggers:
  - Below `sm`: a single icon-only `+` button (`aria-label="Create"`) that opens a shadcn `DropdownMenu` with "New Item" and "New Collection"
  - From `sm` up: the current two buttons (New Collection, New Item), unchanged
- Change `NewItemDialog` and `NewCollectionDialog` to controlled dialogs (`open` / `onOpenChange` props) without a built-in trigger, so the dropdown and the buttons open the same dialog instance. Their form behavior stays the same
- Each dialog is rendered once, not once per breakpoint
- Opening a dialog from a dropdown item must not leave focus stuck or the page `pointer-events: none` after closing (a known Radix issue when a dialog opens from a menu item; open it in `onSelect`, and if needed delay until the menu has closed)
- Restores "New Collection" on phones instead of hiding it

### 4. Favorites moves out of the top bar below `sm`

- Hide the Favorites star in the top bar below `sm`
- Add a "Favorites" link (`Star` icon, `/favorites`) to the sidebar navigation at all widths. On phones the sidebar is the drawer, so Favorites stays reachable
- Highlight the link as active on `/favorites`, matching the other sidebar links

### Result

Phone (< 640px):

```
[☰]  [🔍]                    [+]
```

Tablet/desktop: same as today (full search box, Favorites star, New Collection, New Item), without the overflow.

## Out of scope

- Desktop layout changes beyond the overflow fix
- New create flows or new dialog fields
- Changes to the command palette itself

## Testing

- No unit tests: this changes only components and a layout, which the coding standards leave out of unit tests
- Playwright at 320, 375, 430, 640, 768, 1024 and 1366px:
  - No horizontal scroll at any width
  - Every action is reachable: sidebar toggle, search (click and `Ctrl+K`), Favorites (top bar from `sm` up, sidebar at all widths), New Item, New Collection
  - Below `sm`, the `+` menu opens each dialog; after closing, the page is still clickable and focus returns to the trigger
  - Creating an item and a collection from the phone layout still works
- Run `npm test` and `npm run build`
