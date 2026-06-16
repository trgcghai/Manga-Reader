# MR45 — Public Library Search & Filter Design

## Overview

Add title search and status filter to the public library page (`/_app/`). The backend `GET /mangas` currently only supports `page` and `limit` — this adds `search` and `status` query params. The frontend adds a filter bar above the manga grid with debounced search input, a status dropdown, and dismissable active chips.

---

## Backend Changes

### `manga.controller.ts`
Add `@Query('search') search?: string` and `@Query('status') status?: string` to the `findAll` handler. Pass both to `mangaService.findAll`.

### `manga.service.ts`
Accept `search` and `status` in `findAll`, forward to repository.

### `manga.repository.ts`
Extend `findAll` signature to accept optional `search` and `status`:

```ts
findAll(
  page: number,
  limit: number,
  search?: string,
  status?: string,
): Promise<PaginatedResult<Manga>>
```

- If `search` is provided, match against `manga.title`, `manga.alternativeTitles`, `manga.description`, `authors.name`, and `genres.name` using LIKE/ILIKE
- If `status` is provided, add `WHERE manga.status = :status`
- Both can be combined
- For relation fields (authors, genres), use a TypeORM `LEFT JOIN` and search with `LIKE` on the related table columns
- Keep existing `relations: ['authors', 'genres']` and `order: { createdAt: 'DESC' }`

---

## Frontend Changes

### `mangaApi.ts` — `getAllMangas`

Change signature from positional params to an object:

```ts
getAllMangas({ page, limit, search, status }: {
  page: number
  limit: number
  search?: string
  status?: string
}): Promise<PaginatedResponse<MangaResponse>>
```

Pass `search` and `status` as query params when present.

### `useManga.ts` — `useMangaList`

Change to object param:

```ts
useMangaList({ page, limit, search, status }: {
  page: number
  limit: number
  search?: string
  status?: string
})
```

Update `mangaKeys.list` to include `search` and `status` so React Query cache keys are filter-aware and refetch on change.

### `LibraryFilterBar` (new component)

File: `frontend/src/components/library/LibraryFilterBar.tsx`

Props:

```ts
interface LibraryFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
}
```

Layout:

```
┌────────────────────────────────────────────┐
│ 🔍 Search title...        [Status    ▼]    │
│                           ongoing     ✕    │  (if filter active)
│                           completed   ✕    │  (if filter active)
└────────────────────────────────────────────┘
```

- **Search**: Input with `Search` icon (lucide), placeholder "Search by title…", debounced 300ms via `useEffect` + `setTimeout` (no external debounce lib)
- **Status**: `<Select>` from shadcn with options: All, Ongoing, Completed, Paused
- **Active chips**: When status is set, show a `<Badge>` with the status value and an `×` to clear it
- **Responsive**: On narrow screens the search and dropdown stack vertically

### `_app/index.tsx` — Page integration

Add `search` and `status` to React state alongside `page`. A `useEffect` resets `page` to 1 whenever `search` or `status` changes.

```tsx
const [search, setSearch] = useState('')
const [status, setStatus] = useState('')
const [page, setPage] = useState(1)

// Reset to page 1 when filters change
useEffect(() => { setPage(1) }, [search, status])
```

Layout:
```
<LibraryFilterBar
  search={search}
  onSearchChange={setSearch}
  status={status}
  onStatusChange={setStatus}
/>
{isLoading && <skeleton grid />}
{isError && <error display />}
{data && data.data.length === 0 && (search || status) && <empty state "No mangas match your filters">}
{data && data.data.length === 0 && !search && !status && <empty state "No mangas in the library yet">}
<Pagination ... />
```

---

## Files Changed

| File | Change |
|------|--------|
| `backend/src/modules/manga/manga.controller.ts` | Add `search`, `status` query params |
| `backend/src/modules/manga/services/manga.service.ts` | Forward params to repository |
| `backend/src/modules/manga/repositories/manga.repository.ts` | Filter logic in SQL/TypeORM query |
| `frontend/src/services/api/mangaApi.ts` | `getAllMangas` → object param, pass search/status |
| `frontend/src/hooks/useManga.ts` | `useMangaList` → object param, updated cache keys |
| `frontend/src/components/library/LibraryFilterBar.tsx` | New filter bar component |
| `frontend/src/routes/_app/index.tsx` | Wire state + filter bar |
