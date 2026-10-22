# MR126: Frontend Tracking Sources Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the tracking sources frontend data layer to take an options object including `search`, so MR127's search box can filter server-side.

**Architecture:** Convert `getTrackingSources` (trackingApi.ts) and `useTrackingSources` (useTracking.ts) from positional args to a single `TrackingSourceListParams` options object (mangaId/page/limit/search), mirroring the `useMangaList`/`mangaKeys.list` precedent. `search` is forwarded as a query param only when truthy; the query key includes all fields so different searches get distinct cache entries. Two component call sites and the hook spec are updated in the same effort.

**Tech Stack:** TypeScript, React, TanStack Query, axios, Vitest, React Testing Library, TanStack Start.

**Spec:** `docs/superpowers/specs/2026-08-04-tracking-sources-frontend-search-design.md`
**Task:** `tasks/MR126.md`

---

## File Structure

- Modify: `frontend/src/services/api/trackingApi.ts` — `TrackingSourceListParams` interface + object-param `getTrackingSources`
- Modify: `frontend/src/hooks/useTracking.ts` — `trackingKeys.sourceList(params)` + object-param `useTrackingSources`
- Modify: `frontend/src/hooks/useTracking.spec.tsx` — convert 2 tests, add 1 search test
- Modify: `frontend/src/components/tracking/TrackingPage.tsx:30` — call-site conversion
- Modify: `frontend/src/components/tracking/ManageSourcesDialog.tsx:55-59` — call-site conversion

---

### Task 1: Write the failing hook tests for the options-object signature

**Skills:** test-driven-development, react-testing-library, vitest

**Files:**
- Modify: `frontend/src/hooks/useTracking.spec.tsx:86-107`

- [ ] **Step 1: Replace the two existing `useTrackingSources` tests and add the search test**

In `frontend/src/hooks/useTracking.spec.tsx`, replace the entire `describe('useTrackingSources', ...)` block (currently lines 86-107) with:

```tsx
  describe('useTrackingSources', () => {
    it('fetches sources with the provided params', async () => {
      const { result } = renderHook(
        () => useTrackingSources({ mangaId: 1, page: 2, limit: 20 }),
        { wrapper: createWrapper() },
      )

      await waitFor(() => expect(result.current.data).toEqual(paginatedMock))
      expect(getTrackingSources).toHaveBeenCalledWith({
        mangaId: 1,
        page: 2,
        limit: 20,
      })
    })

    it('passes an empty object when called without args', async () => {
      renderHook(() => useTrackingSources(), { wrapper: createWrapper() })

      await waitFor(() => expect(getTrackingSources).toHaveBeenCalledWith({}))
    })

    it('forwards the search term', async () => {
      renderHook(() => useTrackingSources({ search: 'naruto' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() =>
        expect(getTrackingSources).toHaveBeenCalledWith({ search: 'naruto' }),
      )
    })
  })
```

- [ ] **Step 2: Run the tests and verify they fail (RED)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run src/hooks/useTracking.spec.tsx`

Expected: FAIL — `useTrackingSources` still takes positional args, so `getTrackingSources` is called with `(object, undefined, undefined)` instead of a single object; the 3 assertions fail.

---

### Task 2: Implement the options-object signature in the API client and hook

**Skills:** test-driven-development, tanstack-query-best-practices

**Files:**
- Modify: `frontend/src/services/api/trackingApi.ts:55-68`
- Modify: `frontend/src/hooks/useTracking.ts:19-35`

- [ ] **Step 1: Add `TrackingSourceListParams` and rewrite `getTrackingSources`**

In `frontend/src/services/api/trackingApi.ts`, replace the current `getTrackingSources` (lines 55-68) with:

```ts
export interface TrackingSourceListParams {
  mangaId?: number
  page?: number
  limit?: number
  search?: string
}

export async function getTrackingSources(
  params: TrackingSourceListParams = {},
): Promise<PaginatedTrackingSourceResponse> {
  const queryParams: Record<string, string | number> = {}
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  queryParams.page = page
  queryParams.limit = limit
  if (params.mangaId !== undefined) queryParams.mangaId = params.mangaId
  if (params.search) queryParams.search = params.search

  const { data } = await axiosInstance.get<PaginatedTrackingSourceResponse>(
    '/tracking-sources',
    { params: queryParams },
  )
  return data
}
```

Place the `TrackingSourceListParams` interface just above the function. Rules: `page`/`limit` default to 1/20; `mangaId` added only when `!== undefined`; `search` added only when truthy.

- [ ] **Step 2: Rewrite `trackingKeys.sourceList` and `useTrackingSources`**

In `frontend/src/hooks/useTracking.ts`:

1. Add `TrackingSourceListParams` to the existing type import from `'#/services/api/trackingApi'` (currently lines 9-15):

```ts
import type {
  PaginatedTrackingSourceResponse,
  TrackingSourceListParams,
  CreateTrackingSourcePayload,
  UpdateTrackingSourcePayload,
  TrackingConfigResponse,
  UpdateTrackingConfigPayload,
} from '#/services/api/trackingApi'
```

2. Replace the `trackingKeys` object (lines 19-24) with:

```ts
const trackingKeys = {
  all: ['tracking'] as const,
  sourceList: (params: TrackingSourceListParams = {}) =>
    [
      ...trackingKeys.all,
      'sources',
      params.mangaId,
      params.page,
      params.limit,
      params.search,
    ] as const,
  config: () => [...trackingKeys.all, 'config'] as const,
}
```

3. Replace `useTrackingSources` (lines 26-35) with:

```ts
export function useTrackingSources(params: TrackingSourceListParams = {}) {
  return useQuery<PaginatedTrackingSourceResponse>({
    queryKey: trackingKeys.sourceList(params),
    queryFn: () => getTrackingSources(params),
  })
}
```

The hook stays pure: no debounce, no trim (UI layer owns debounce in MR127; backend trims).

- [ ] **Step 3: Fix the pre-existing sonner mock typing in the spec**

The file has 4 pre-existing tsc errors at `useTracking.spec.tsx:25-28` (`Property 'loading'/'success'/'warning'/'error' does not exist on type 'Mock<Procedure>'`) because `toastFn.loading = vi.fn()` is assigned onto a bare `vi.fn()`. Fix by composing the mock with `Object.assign`:

Replace the `vi.mock('sonner', ...)` block (currently lines 23-30):

```ts
vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  })
  return { default: toastFn, toast: toastFn }
})
```

This keeps runtime behavior identical and clears the 4 type errors.

- [ ] **Step 4: Run the hook tests and verify they pass (GREEN)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run src/hooks/useTracking.spec.tsx`

Expected: PASS — all suites in the file, including the 3 `useTrackingSources` tests.

- [ ] **Step 5: Format and lint the touched files**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx prettier --write src/services/api/trackingApi.ts src/hooks/useTracking.ts src/hooks/useTracking.spec.tsx && npx eslint src/services/api/trackingApi.ts src/hooks/useTracking.ts src/hooks/useTracking.spec.tsx`

Expected: prettier reformats nothing (or trivially); eslint exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/api/trackingApi.ts frontend/src/hooks/useTracking.ts frontend/src/hooks/useTracking.spec.tsx
git commit -m "refactor: accept options object with search in tracking sources data layer"
```

---

### Task 3: Update the two component call sites

**Skills:** tanstack-query-best-practices, vercel-react-best-practices

**Files:**
- Modify: `frontend/src/components/tracking/TrackingPage.tsx:30`
- Modify: `frontend/src/components/tracking/ManageSourcesDialog.tsx:55-59`

- [ ] **Step 1: Convert the `TrackingPage` call**

In `frontend/src/components/tracking/TrackingPage.tsx`, line 30, change:

```tsx
  } = useTrackingSources(undefined, page, pageSize)
```

to:

```tsx
  } = useTrackingSources({ page, limit: pageSize })
```

- [ ] **Step 2: Convert the `ManageSourcesDialog` call**

In `frontend/src/components/tracking/ManageSourcesDialog.tsx`, lines 55-59, change:

```tsx
  const { data, isLoading, isError, refetch } = useTrackingSources(
    mangaId,
    1,
    100,
  )
```

to:

```tsx
  const { data, isLoading, isError, refetch } = useTrackingSources({
    mangaId,
    page: 1,
    limit: 100,
  })
```

- [ ] **Step 3: Run the full frontend test suite and typecheck the touched files**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run test`

Expected: all vitest suites pass.

Then typecheck scoped to the touched files:

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx tsc --noEmit 2>&1 | Select-String -Pattern "TrackingPage|ManageSourcesDialog"`

Expected: NO output — the two converted components are type-clean. (The repo has ~29 pre-existing tsc errors in unrelated files — out of scope.)

- [ ] **Step 4: Format and lint the touched files**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx prettier --write src/components/tracking/TrackingPage.tsx src/components/tracking/ManageSourcesDialog.tsx && npx eslint src/components/tracking/TrackingPage.tsx src/components/tracking/ManageSourcesDialog.tsx`

Expected: eslint exits 0 with no output.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tracking/TrackingPage.tsx frontend/src/components/tracking/ManageSourcesDialog.tsx
git commit -m "refactor: use options object for tracking sources hook in components"
```

---

### Task 4: Full verification (tests, types, lint, manual)

**Skills:** verification-before-completion, systematic-debugging, vitest

**Files:** none (verification only)

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run test`

Expected: all suites pass.

- [ ] **Step 2: Lint the touched files (5 total)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx eslint src/services/api/trackingApi.ts src/hooks/useTracking.ts src/hooks/useTracking.spec.tsx src/components/tracking/TrackingPage.tsx src/components/tracking/ManageSourcesDialog.tsx`

Expected: exit 0, no output. (Repo-wide lint may show pre-existing errors elsewhere — out of scope.)

- [ ] **Step 3: Typecheck the touched files (scoped — repo has pre-existing errors elsewhere)**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx tsc --noEmit 2>&1 | Select-String -Pattern "useTracking|trackingApi|TrackingPage|ManageSourcesDialog"`

Expected: NO output — the 5 touched files are type-clean. (The repo has ~29 pre-existing tsc errors in unrelated files — out of scope. The two TS2345 RED errors from Task 1 must be gone.)

- [ ] **Step 4: Prettier check on touched files**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx prettier --check src/services/api/trackingApi.ts src/hooks/useTracking.ts src/hooks/useTracking.spec.tsx src/components/tracking/TrackingPage.tsx src/components/tracking/ManageSourcesDialog.tsx`

Expected: exit 0, "All matched files use Prettier code style!"

- [ ] **Step 5: Manual smoke check (if dev servers are running)**

With backend on :3001 and frontend on :3000:
- `http://localhost:3000` loads without console errors
- Tracking page: table renders, pagination works, Manage Sources dialog opens and lists the manga's sources

If servers aren't running, note it and skip (the automated checks cover the change).

---

### Task 5: Commit any leftover formatting from verification

**Skills:** none

**Files:** none expected

- [ ] **Step 1: Check for unstaged changes and commit if any**

```bash
git status --short
```

If prettier/eslint --fix left formatting changes in the 5 touched files (they shouldn't), stage and commit them:

```bash
git add frontend/src/services/api/trackingApi.ts frontend/src/hooks/useTracking.ts frontend/src/hooks/useTracking.spec.tsx frontend/src/components/tracking/TrackingPage.tsx frontend/src/components/tracking/ManageSourcesDialog.tsx
git commit -m "style: apply formatting to tracking search data layer"
```

If `git status` is clean, skip the commit.
