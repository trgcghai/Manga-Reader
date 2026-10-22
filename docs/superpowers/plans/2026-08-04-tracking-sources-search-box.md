# MR127: Debounced Search Box for Tracking Sources Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a debounced, server-side search box above the tracking sources table that filters on manga title and source name via the `search` query param.

**Architecture:** `TrackingPage` owns search state (`searchInput` raw + `useDebounce(searchInput, 300)` via the existing shared hook) and passes `search: search.trim() || undefined` into the MR126 options-object hook; `TrackingSourcesTable` becomes presentational with `search`/`onSearchChange` props, rendering a LibraryFilterBar-style input (Search icon + clear button) above all states and a differentiated empty state when a search matches nothing.

**Tech Stack:** TypeScript, React, TanStack Query, shadcn/ui (`Input`, `Empty`), lucide-react icons, Vitest, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-04-tracking-sources-search-box-design.md`
**Task:** `tasks/MR127.md`

---

## File Structure

- Create: `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx` — component tests (router Link mocked)
- Modify: `frontend/src/components/tracking/TrackingSourcesTable.tsx` — search box UI + differentiated empty state
- Modify: `frontend/src/components/tracking/TrackingPage.tsx` — search state, debounce, hook call, page reset, table props

---

### Task 1: Write the failing component spec for the search box

**Skills:** test-driven-development, react-testing-library, vitest

**Files:**
- Create: `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx`

- [ ] **Step 1: Create the spec file**

Create `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx` with exactly this content:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TrackingSourcesTable } from './TrackingSourcesTable'
import type { PaginatedTrackingSourceResponse } from '#/services/api/trackingApi'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const mockPage: PaginatedTrackingSourceResponse = {
  data: [
    {
      id: 1,
      mangaId: 1,
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      manga: { id: 1, title: 'One Piece' },
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
}

interface RenderTableProps {
  data?: PaginatedTrackingSourceResponse
  isLoading?: boolean
  isError?: boolean
  page?: number
  pageSize?: number
  search?: string
  onSearchChange?: (value: string) => void
}

function renderTable(overrides: RenderTableProps = {}) {
  return render(
    <TrackingSourcesTable
      data={overrides.data}
      isLoading={overrides.isLoading ?? false}
      isError={overrides.isError ?? false}
      page={overrides.page ?? 1}
      pageSize={overrides.pageSize ?? 20}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onRetry={vi.fn()}
      onManage={vi.fn()}
      search={overrides.search ?? ''}
      onSearchChange={overrides.onSearchChange ?? vi.fn()}
    />,
  )
}

describe('TrackingSourcesTable', () => {
  it('renders a search input with an accessible label', () => {
    renderTable()

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
  })

  it('calls onSearchChange when typing', async () => {
    const onSearchChange = vi.fn()
    const user = userEvent.setup()
    renderTable({ onSearchChange })

    await user.type(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
      'naru',
    )

    expect(onSearchChange).toHaveBeenLastCalledWith('naru')
  })

  it('shows the clear button when search is non-empty and clears on click', async () => {
    const onSearchChange = vi.fn()
    const user = userEvent.setup()
    renderTable({ search: 'naruto', onSearchChange })

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('does not show the clear button when search is empty', () => {
    renderTable()

    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument()
  })

  it('renders the search box in the loading state', () => {
    renderTable({ isLoading: true })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
  })

  it('renders the search box in the error state', () => {
    renderTable({ isError: true })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
  })

  it('renders the search box above a populated table', () => {
    renderTable({ data: mockPage })

    expect(
      screen.getByRole('textbox', { name: 'Search tracking sources' }),
    ).toBeInTheDocument()
    expect(screen.getByText('MangaDex')).toBeInTheDocument()
  })

  it('shows search-specific empty copy when a search matches nothing', () => {
    renderTable({
      data: { ...mockPage, data: [], total: 0, totalPages: 0 },
      search: 'zzz',
    })

    expect(screen.getByText('No Sources Match Your Search')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No sources match "zzz". Try a different search term or clear the search.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the generic empty copy when no search and no sources', () => {
    renderTable({ data: { ...mockPage, data: [], total: 0, totalPages: 0 } })

    expect(screen.getByText('No Tracking Sources')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests and verify they fail (RED)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run src/components/tracking/TrackingSourcesTable.spec.tsx`

Expected: FAIL — the component does not yet accept `search`/`onSearchChange` props and renders no input; all 9 tests fail (`Unable to find role "textbox" with name "Search tracking sources"`).

---

### Task 2: Implement the search box UI and differentiated empty state

**Skills:** test-driven-development, frontend-design

**Files:**
- Modify: `frontend/src/components/tracking/TrackingSourcesTable.tsx`

- [ ] **Step 1: Add the props and imports**

In `frontend/src/components/tracking/TrackingSourcesTable.tsx`:

1. Add to the imports (lucide icons at the top, line 2):

```tsx
import { Eye, Radar, Search, X } from 'lucide-react'
```

2. Add `Input` to the shadcn imports:

```tsx
import { Input } from '#/components/ui/input'
```

3. Extend the props interface (lines 33-43):

```tsx
interface TrackingSourcesTableProps {
  data?: PaginatedTrackingSourceResponse
  isLoading: boolean
  isError: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRetry: () => void
  onManage: (source: TrackingSourceResponse) => void
  search: string
  onSearchChange: (value: string) => void
}
```

4. Destructure the new props (lines 45-55):

```tsx
export function TrackingSourcesTable({
  data,
  isLoading,
  isError,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onManage,
  search,
  onSearchChange,
}: TrackingSourcesTableProps) {
```

- [ ] **Step 2: Render the search box above all states**

Insert this block at the top of the returned root `<div className="mt-6">` (before the `{isLoading && ...}` block, line 60):

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

- [ ] **Step 3: Differentiate the empty state**

Replace the empty-state block (lines 80-92) with:

```tsx
      {data && data.data.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Radar />
            </EmptyMedia>
            <EmptyTitle>
              {search
                ? 'No Sources Match Your Search'
                : 'No Tracking Sources'}
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

- [ ] **Step 4: Run the spec and verify it passes (GREEN)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run src/components/tracking/TrackingSourcesTable.spec.tsx`

Expected: PASS — all 9 tests.

- [ ] **Step 5: Format and lint**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx prettier --write src/components/tracking/TrackingSourcesTable.tsx src/components/tracking/TrackingSourcesTable.spec.tsx && npx eslint src/components/tracking/TrackingSourcesTable.tsx src/components/tracking/TrackingSourcesTable.spec.tsx`

Expected: eslint exits 0, no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/tracking/TrackingSourcesTable.tsx frontend/src/components/tracking/TrackingSourcesTable.spec.tsx
git commit -m "feat: add debounced search box to tracking sources table"
```

Verify with `git log --oneline -1`.

---

### Task 3: Wire search state into TrackingPage

**Skills:** tanstack-query-best-practices, vercel-react-best-practices

**Files:**
- Modify: `frontend/src/components/tracking/TrackingPage.tsx`

- [ ] **Step 1: Add the debounced search state**

In `frontend/src/components/tracking/TrackingPage.tsx`:

1. Add the `useDebounce` import after the existing imports:

```tsx
import { useDebounce } from '#/hooks/useDebounce'
```

2. Add state and debounce after the existing `pageSize` state (line 17):

```tsx
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 300)
```

3. Change the hook call (line 30) from:

```tsx
  } = useTrackingSources({ page, limit: pageSize })
```

to:

```tsx
  } = useTrackingSources({ page, limit: pageSize, search: search.trim() || undefined })
```

- [ ] **Step 2: Add the page-reset effect**

Add after the existing pageSize effect (lines 33-35):

```tsx
  useEffect(() => {
    setPage(1)
  }, [search])
```

- [ ] **Step 3: Pass the search props to the table**

Add to the `TrackingSourcesTable` JSX (around lines 64-72):

```tsx
        search={searchInput}
        onSearchChange={setSearchInput}
```

- [ ] **Step 4: Verify**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run test`

Expected: all vitest suites pass (5 existing files + the new spec).

Scoped typecheck (repo has ~29 pre-existing tsc errors elsewhere — ignore those):

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx tsc --noEmit 2>&1 | Select-String -Pattern "TrackingPage|TrackingSourcesTable"`

Expected: NO output.

- [ ] **Step 5: Format and lint**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx prettier --write src/components/tracking/TrackingPage.tsx && npx eslint src/components/tracking/TrackingPage.tsx`

Expected: eslint exits 0, no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/tracking/TrackingPage.tsx
git commit -m "feat: wire debounced search state into tracking page"
```

Verify with `git log --oneline -1`.

---

### Task 4: Full verification

**Skills:** verification-before-completion, systematic-debugging, vitest

**Files:** none (verification only)

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run test`

Expected: all suites pass (including the 9 new TrackingSourcesTable tests).

- [ ] **Step 2: Scoped typecheck**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx tsc --noEmit 2>&1 | Select-String -Pattern "TrackingPage|TrackingSourcesTable"`

Expected: NO output.

- [ ] **Step 3: Lint and prettier on touched files (3 files)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx eslint src/components/tracking/TrackingPage.tsx src/components/tracking/TrackingSourcesTable.tsx src/components/tracking/TrackingSourcesTable.spec.tsx && npx prettier --check src/components/tracking/TrackingPage.tsx src/components/tracking/TrackingSourcesTable.tsx src/components/tracking/TrackingSourcesTable.spec.tsx`

Expected: eslint exit 0, no output; prettier "All matched files use Prettier code style!".

- [ ] **Step 4: End-to-end manual check (dev servers on :3000/:3001)**

In a browser at `http://localhost:3000/admin/tracking`:
- Search box renders above the table with the Search icon and accessible label
- Type "manga" → after ~300ms the table filters to sources whose name or manga title contains "manga" (server-side; 3 seeded sources → 2 matches: MangaDex, NewManga)
- Clear button appears; click it → full list restored, page back to 1
- Type a nonsense term → "No Sources Match Your Search" empty state
- Verify via network tab that requests fire at most once per pause in typing

If servers aren't running, note it and skip (automated checks cover the change).

---

### Task 5: Commit any leftover formatting from verification

**Skills:** none

**Files:** none expected

- [ ] **Step 1: Check for unstaged changes and commit if any**

```bash
git status --short
```

If prettier/eslint --fix left formatting changes in the 3 touched files (they shouldn't), stage and commit them:

```bash
git add frontend/src/components/tracking/TrackingPage.tsx frontend/src/components/tracking/TrackingSourcesTable.tsx frontend/src/components/tracking/TrackingSourcesTable.spec.tsx
git commit -m "style: apply formatting to tracking search box"
```

If `git status` is clean, skip the commit.
