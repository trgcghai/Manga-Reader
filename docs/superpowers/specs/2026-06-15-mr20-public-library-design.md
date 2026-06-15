# MR20 — Public Library Page — Design

## Route
- Replace `/` (`routes/index.tsx`) which currently renders a "Hello, Manga Reader!" placeholder
- No layout wrapper for now (no public header/nav)

## Component Architecture

```
routes/index.tsx
  └─ <LibraryPage />
       └─ useMangaList(page, pageSize)
       └─ loading → Skeleton grid (8 cards)
       └─ error  → ErrorDisplay with retry
       └─ empty  → Empty with BookOpen icon
       └─ data   → CSS grid of MangaCoverCard + Pagination
```

### Files
- `components/manga/LibraryPage.tsx` — page state, states, grid, pagination
- `components/manga/MangaCoverCard.tsx` — individual card rendering
- `routes/index.tsx` — minimal route definition

### Data Flow
1. `LibraryPage` holds `page` (default 1) and `pageSize` (default 20) state
2. `useMangaList(page, pageSize)` → `PaginatedResponse<MangaResponse>`
3. `coverPath` from response used directly as `<img src>`
4. `Pagination.onPageChange` / `onPageSizeChange` → update state → re-fetch

## MangaCoverCard
```
┌────────────────┐
│  [cover]        │  aspect-[3/4], object-cover, rounded-t-lg
│  or placeholder │
├────────────────┤
│ Title           │  font-semibold, line-clamp-2
│ Author, ...     │  text-sm text-muted-foreground, truncate
│ [Ongoing]       │  Badge (same variant as admin: ongoing=outline, completed=default, else=destructive)
└────────────────┘
```
- Cover null → `BookOpen` icon centered in `bg-muted` area
- Card: `rounded-lg border bg-card` — no pointer cursor, not clickable
- Grid: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 lg:gap-6`

## States
- **Loading**: Skeleton grid matching card layout
- **Error**: `<ErrorDisplay>` with retry button (re-triggers query)
- **Empty**: `<Empty>` with `BookOpen` icon, "No mangas in the library yet"
- **Data**: Card grid + `<Pagination>` component below

## Pagination
- Existing `Pagination` component from `#/components/ui/pagination`
- Props from `PaginatedResponse`: `page`, `totalPages`, `total` (items), `limit` (pageSize)
- Page/pageSize changes update local state → trigger re-fetch

## No Scope
- No search / filter / sort
- No detail page navigation (future MR)
- No auth
- No new backend endpoints
- No new dependencies

## Out of Scope
- Search/filter/sort
- Detail page
- Cover image optimization or upload
- List view toggle
