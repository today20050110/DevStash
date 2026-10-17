# Tags

## Overview

Make tags useful for finding things. Today tags can be typed (comma-separated) when creating or editing an item and are shown on cards and in the drawer, but nothing can be done with them: you can't click a tag, see all items with a tag, or reuse existing tags while typing.

This is step 7 of the build order in `context/project-overview.md`. The data model already exists (`Tag` scoped to the user with a unique `slug`, `ItemTag` join table with `source`), so **no migration is needed**.

## Requirements

### 1. Tag page: `/tags/[slug]`

- Lists all of the current user's non-deleted items that have the tag, with the same card grid and pagination as the type and collection pages (`ItemGrid`, `ListPagination`, pinned first, then newest)
- Header: tag name and item count (e.g. `# react` · 6 items)
- Data access in a new `src/lib/db/tags.ts`, always scoped by `userId`:
  - `getTagBySlug(userId, slug)`: another user's tag or an unknown slug → `notFound()`
  - `getItemsByTagPage(userId, tagId, page)` in `src/lib/db/items.ts`, reusing the existing `getItemsPage` with `{ tags: { some: { tagId } } }`
- Same page structure as `/items/[type]`: `connection()`, redirect to sign-in when there's no user, `cache()`'d lookup shared by `generateMetadata` (title `#react — DevStash`) and the page
- Add `/tags/:path*` to the `proxy.ts` matcher
- Slugs come from `toTagSlug` and can contain characters like `+` or `.` (`c++`, `next.js`), so build links with `encodeURIComponent` and decode the route param

### 2. Tags are clickable

- Tag badges on `ItemCard` and in the drawer's Tags section become links to `/tags/[slug]`
- On `ItemCard`, the badges must sit above the `ItemCardTrigger` overlay (`relative z-10`, like the favorite and copy buttons), so clicking a tag navigates and clicking elsewhere still opens the drawer
- Clicking a tag in the drawer navigates and closes the drawer
- Build the href in one place (e.g. `tagHref(name)` in `src/lib/tags.ts`), since cards and the drawer only have tag names; the slug comes from `toTagSlug(name)`, the same function used when tags are saved

### 3. Tags index: `/tags`

- Lists all of the user's tags that are used by at least one non-deleted item, with their item counts, sorted by count (desc), then name
- Each tag links to its tag page
- Empty state when there are no tags
- Add a "Tags" link (lucide `Tag` icon) to the sidebar, next to the Favorites link
- Read-only: no rename, merge or delete (out of scope)

### 4. Autocomplete in the Tags field

- The Tags input (`ItemFormFields`, used by both the New Item dialog and the drawer's edit mode) suggests the user's existing tags while typing
- Suggestions match the segment after the last comma (case-insensitive substring match on the name), exclude tags already entered in the field, and show at most 6, ordered by item count
- Picking a suggestion (click, or Enter/Tab on the highlighted one) replaces the current segment with the tag's name followed by `, ` and keeps focus in the input
- Keyboard: ArrowDown/ArrowUp moves the highlight, Escape closes the list, Enter with no highlight submits the form as before
- Accessible combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`; the list is `role="listbox"` with `role="option"` items
- New tags can still be typed freely; autocomplete only suggests
- Data: load the user's tag names and counts once in `src/app/(app)/layout.tsx`, in the existing `Promise.all`, and pass them down the same way `collections` reaches the forms (Topbar → `TopbarActions` → `NewItemDialog`, and `ItemDrawerProvider` → the edit form). The forms already call `router.refresh()` after saving, so newly created tags show up afterwards
- Put the pure logic in `src/lib/tags.ts` (current segment, filtering and ranking, applying a suggestion) so it can be unit tested; the component only handles state and rendering

## Out of scope

- Renaming, merging or deleting tags
- AI tag suggestions (`source = AI_SUGGESTED`; that's step 10)
- Searching by tag in the Ctrl+K palette
- Filtering by several tags at once, or combining a tag with a type filter

## Testing

- Unit tests (Vitest):
  - `src/lib/tags.ts`: current segment extraction (empty input, trailing comma, spaces), suggestion filtering (case, already-entered tags, limit, ordering), applying a suggestion, and `tagHref` encoding (`c++`, `next.js`, spaces)
  - `src/lib/db/tags.ts` and `getItemsByTagPage`: user scoping (another user's tag → null) and `deletedAt` filtering, with `@/lib/prisma` mocked as in the existing db tests
- Playwright (`localhost:3000`, Development, demo account; don't create or modify data except through normal UI flows you undo afterwards):
  - Clicking a tag on a card goes to its tag page; clicking elsewhere on the card still opens the drawer; clicking a tag in the drawer navigates and closes the drawer
  - `/tags` lists tags with correct counts; a tag page shows the matching items and pagination; an unknown slug → 404
  - Autocomplete in the New Item dialog and the drawer edit form: mouse and keyboard selection, Escape, Enter still submits
  - 375, 768 and 1366px: no horizontal scroll, no console errors
- Run `npm test` and `npm run build`
