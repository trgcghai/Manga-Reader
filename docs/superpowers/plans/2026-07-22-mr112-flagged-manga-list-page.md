# MR112 — Flagged Manga List Page Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `/flagged` route displaying all flagged manga with a flag filter, card grid, and pagination.

**Architecture:** Single new file `frontend/src/routes/_app/flagged.tsx`. Mirrors the library page (`_app/index.tsx`) pattern — same grid layout, pagination, skeleton/error/empty states — but with a flag-only `<Select>` filter instead of the full `LibraryFilterBar`.

**Tech Stack:** React, TanStack Router (file-based routing), TanStack React Query, shadcn/ui (Select, Skeleton, Pagination, ErrorDisplay, Empty), lucide-react

**Related Skills:**
- `tanstack-router-best-practices` (Task 1) — file-based route creation in `_app/` layout
- `tanstack-query-best-practices` (Task 1) — `useMangaList` hook with `readingFlag` param

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/routes/_app/flagged.tsx` | Create | New page route under `_app` layout |
| `frontend/src/routeTree.gen.ts` | Auto-generated | Regenerated via `npm run generate-routes` |

---

### Task 1: Create flagged route file

**Related skills:** `tanstack-router-best-practices`, `tanstack-query-best-practices`

Create `frontend/src/routes/_app/flagged.tsx` with the full page component:

- [ ] **Write imports** — `createFileRoute, Link` from `@tanstack/react-router`; `useState` from `react`; `useMangaList` from hooks; `MangaResponse`, `ReadingFlagFilter`, `READING_FLAGS` from `mangaApi`; `MangaCard`; `Pagination`; `Skeleton`; `ErrorDisplay`, `ErrorTitle`, `ErrorDescription`; `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`; `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`; `ArrowLeft, Bookmark` from `lucide-react`; `Button`; `getReadingFlagLabel`

- [ ] **Write route export** — `export const Route = createFileRoute('/_app/flagged')({ component: FlaggedPage })`

- [ ] **Write state and data fetching** — `useState` for `page` (1), `pageSize` (20), `filterFlag` (`'any'` as `ReadingFlagFilter`); `useEffect` resets `page` to 1 on `filterFlag` change; `const { data, isLoading, isError, refetch } = useMangaList({ page, limit: pageSize, readingFlag: filterFlag })`

- [ ] **Write header row** — flex row with `<Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Library</Link>` on left; `<Select value={filterFlag} onValueChange={(v: ReadingFlagFilter) => setFilterFlag(v)}>` on right with `<SelectItem value="any">All</SelectItem>` + each `READING_FLAGS` item using `getReadingFlagLabel`

- [ ] **Write loading state** — 8 skeleton cards in `grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6` (same pattern as `index.tsx:61-71`)

- [ ] **Write error state** — `<ErrorDisplay>` with title "Failed to Load Reading List" and `<Button onClick={() => refetch()}>Retry</Button>`

- [ ] **Write empty state** — `<Empty>` with `Bookmark` icon and title "No flagged mangas"

- [ ] **Write results view** — grid of `<Link to="/manga/$id" params={{ id: String(manga.id) }}><MangaCard manga={manga} /></Link>` + `<Pagination page totalPages totalItems pageSize onPageChange onPageSizeChange>`

---

### Task 2: Regenerate route tree and verify build

- [ ] **Regenerate route tree:**

```bash
cd frontend && npm run generate-routes
```

- [ ] **Run type check:**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no new TS errors (only pre-existing errors in other files).

- [ ] **Run existing tests:**

```bash
cd frontend && npm run test
```

Expected: 4 test files, 47 tests, all passed.
