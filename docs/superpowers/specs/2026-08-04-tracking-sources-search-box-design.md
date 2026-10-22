# MR127 Design: Debounced Search Box for Tracking Sources Table

**Date:** 2026-08-04
**Status:** Approved by user
**Dependencies:** MR125 (committed — backend `search` param), MR126 (committed — frontend data layer accepts `TrackingSourceListParams` incl. `search`)

## Goal

Add a debounced, server-side search box above the tracking sources table on the Tracking page (`admin/tracking`). Typing filters the list on manga title and source name via the `search` query param, without firing a request per keystroke.

## Decisions (user-approved)

1. **Debounce mechanism:** reuse the existing shared `useDebounce` hook (`frontend/src/hooks/useDebounce.ts`, wraps `lodash/debounce`, already used by admin/authors, genres, translators, and library routes) at 300ms. No new debounce code.
2. **Empty state:** when a search is active and the filtered list is empty, show a differentiated "no match" message; the plain "No Tracking Sources" copy remains for the no-search, truly-empty case.
3. **Search box UI:** `Search` icon inside the input (`pl-9`, LibraryFilterBar style) plus a small `X` clear button that appears when text is present.

## Design

### 1. Search state — `frontend/src/components/tracking/TrackingPage.tsx`

- `const [searchInput, setSearchInput] = useState('')`
- `const search = useDebounce(searchInput, 300)`
- Hook call: `useTrackingSources({ page, limit: pageSize, search: search.trim() || undefined })`
  - Empty or whitespace-only → `undefined` → no `?search=` param and no wasted request/cache entry (the MR126 contract adds `search` only when truthy; trimming here keeps whitespace from producing a useless request)
- Page-reset effect mirroring the existing `pageSize` effect (TrackingPage.tsx:33-35):

```tsx
  useEffect(() => {
    setPage(1)
  }, [search])
```

- Props passed to `TrackingSourcesTable`: `search={searchInput}` (instant UI value) and `onSearchChange={setSearchInput}`

### 2. Search box UI — `frontend/src/components/tracking/TrackingSourcesTable.tsx`

- New props: `search: string`, `onSearchChange: (value: string) => void`
- Rendered above all states (loading / error / empty / populated table) inside the existing root wrapper, LibraryFilterBar-style:

```tsx
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search tracking sources"
          placeholder="Search by manga title or source name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted-foreground/20"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
```

- Empty state differentiation (search active + zero rows):

```tsx
      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Radar />
            </EmptyMedia>
            <EmptyTitle>
              {search ? 'No Sources Match Your Search' : 'No Tracking Sources'}
            </EmptyTitle>
            <EmptyDescription>
              {search
                ? `No sources match "${search}". Try a different search term or clear the search.`
                : 'No tracking sources yet. Add tracking sources to get started.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
```

- No client-side filtering — the table renders whatever `data` contains; filtering is server-side via the `search` param (MR125/MR126).

### 3. Testing — `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx` (new)

Vitest + React Testing Library, following the repo's component-spec conventions (`TranslatorCombobox.spec.tsx`):

- Renders the input with `aria-label="Search tracking sources"`
- Typing calls `onSearchChange` with the new value
- Clear button renders when `search` is non-empty and calls `onSearchChange('')`; absent when empty
- Input renders in all states: loading, error, empty, and populated (each with a mocked `data`/`isLoading`/`isError` combination)
- Empty state shows "No Sources Match Your Search" when `search` prop is non-empty, and the plain "No Tracking Sources" copy when it's empty

Debounce timing itself is not re-tested: `useDebounce` is an existing, repo-wide-tested hook; the component tests pin the input→callback contract and the page wiring is a thin effect. (If a fake-timer debounce test is desired later, it belongs in a `useDebounce` spec, out of MR127 scope.)

## Scope Boundaries

- **In:** `TrackingPage.tsx`, `TrackingSourcesTable.tsx`, new `TrackingSourcesTable.spec.tsx`, task file MR127.md wording update (`q` → `search`, debounce-mechanism decision)
- **Out:** backend (MR125), data layer (MR126), client-side filtering, URL-bound search params (rejected — admin page, not worth URL plumbing)

## Acceptance Criteria

- [ ] Search box renders above the table with an accessible label and Search icon
- [ ] Clear button appears when text is present and resets the list
- [ ] Typing debounces (~300ms) via the existing `useDebounce` hook
- [ ] Empty/whitespace search sends no `?search=` param (`search.trim() || undefined`; full list restored)
- [ ] Page resets to 1 when the debounced search changes
- [ ] Differentiated empty state when a search matches nothing
- [ ] Search box renders in loading/error/empty/populated states
- [ ] `npm run test` in `frontend/` passes; lint and prettier clean on touched files
