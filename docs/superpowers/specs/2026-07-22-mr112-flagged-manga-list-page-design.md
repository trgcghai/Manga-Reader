# MR112 — Flagged Manga List Page

## Overview

New route at `/flagged` (`_app/flagged.tsx`) that lists all manga with a reading flag. Mirrors the library page (`index.tsx`) pattern for grid layout, pagination, and state handling, but replaces the full `LibraryFilterBar` with a flag-specific `<Select>` dropdown.

## Scope

Single new file: `frontend/src/routes/_app/flagged.tsx`. No changes to existing files. The route tree is auto-generated from file discovery.

## Changes

### `_app/flagged.tsx` (new)

**State:**
- `page` (default 1), `pageSize` (default 20), `filterFlag` (default `'any'`)
- When `filterFlag` changes, reset `page` to 1

**Data fetching:**
- `useMangaList({ page, limit: pageSize, readingFlag: filterFlag })`

**Page layout (top to bottom):**

1. **Header row** — flex row, left-to-right: `<Link to="/"><ArrowLeft /> Back to Library</Link>`, then spacer, then `<Select>` with label "All" + each `READING_FLAGS` value using `getReadingFlagLabel` for display

2. **Loading state** — skeleton grid matching library: 8 skeleton cards in `grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6`

3. **Error state** — `<ErrorDisplay>` with title "Failed to Load Reading List", retry button

4. **Empty state** — `<Empty>` with `Bookmark` icon, title "No flagged mangas" when no results

5. **Results** — grid of `<MangaCard>` components wrapped in `<Link to="/manga/$id">`, followed by `<Pagination>`

## Dependencies

- `useMangaList` hook (already has `readingFlag` param)
- `MangaCard` component
- `READING_FLAGS` const from `mangaApi`
- `getReadingFlagLabel` utility from `mangaUtils`
- `Pagination`, `Select`, `Skeleton`, `ErrorDisplay`, `Empty` UI components
- `ArrowLeft`, `Bookmark` icons from `lucide-react`
