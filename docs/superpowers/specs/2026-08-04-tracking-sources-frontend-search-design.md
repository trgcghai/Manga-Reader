# MR126 Design: Thread `search` Through the Frontend Tracking Data Layer

**Date:** 2026-08-04
**Status:** Approved by user (approach B: options-object refactor)
**Backend dependency:** MR125 (committed) — `GET /tracking-sources` accepts optional `search` query param, case-insensitive `LOWER LIKE` filter on source name and manga title.

## Goal

Expose the backend `search` filter on the frontend data layer so a future search box (MR127) can filter the tracking sources table server-side. No UI changes in this task.

## Approach

Options-object refactor of `getTrackingSources` and `useTrackingSources`, following the established `useMangaList`/`mangaKeys.list` precedent (`frontend/src/hooks/useManga.ts:35-71`, `frontend/src/services/api/mangaApi.ts:107-117`). Chosen over positional-threading because the object form scales when the search param is added and matches the manga data-layer convention.

## Design

### 1. API client — `frontend/src/services/api/trackingApi.ts`

- Export new interface:

```ts
export interface TrackingSourceListParams {
  mangaId?: number
  page?: number
  limit?: number
  search?: string
}
```

- Rewrite `getTrackingSources(params: TrackingSourceListParams = {})`:

```ts
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

Rules:
- `mangaId` added only when `!== undefined` (existing pattern preserved).
- `search` added only when truthy (`if (params.search)`) — mirrors `authorApi.ts:33`; empty/whitespace search never produces `?search=`.
- `page`/`limit` default to 1/20 client-side (same values as backend defaults).

### 2. Hook — `frontend/src/hooks/useTracking.ts`

- `trackingKeys.sourceList` becomes:

```ts
sourceList: (params: TrackingSourceListParams = {}) =>
  [
    ...trackingKeys.all,
    'sources',
    params.mangaId,
    params.page,
    params.limit,
    params.search,
  ] as const,
```

  (Same key shape as `mangaKeys.list` — each distinct filter value lands in the key, so different searches get distinct cache entries and mutations invalidating `trackingKeys.all` cover all variants.)

- `useTrackingSources(params: TrackingSourceListParams = {})`:

```ts
export function useTrackingSources(params: TrackingSourceListParams = {}) {
  return useQuery<PaginatedTrackingSourceResponse>({
    queryKey: trackingKeys.sourceList(params),
    queryFn: () => getTrackingSources(params),
  })
}
```

- Hook stays pure: no debounce, no trim. Normalization is owned by the UI layer (MR127: `debouncedSearch || undefined`) and the backend (service trims).

### 3. Call-site updates

- `frontend/src/components/tracking/TrackingPage.tsx:30`
  `useTrackingSources(undefined, page, pageSize)` → `useTrackingSources({ page, limit: pageSize })`
- `frontend/src/components/tracking/ManageSourcesDialog.tsx:55-59`
  `useTrackingSources(mangaId, 1, 100)` → `useTrackingSources({ mangaId, page: 1, limit: 100 })`
- `frontend/src/hooks/useTracking.spec.tsx` — tests convert to object form:
  - `useTrackingSources(1, 2, 20)` → `useTrackingSources({ mangaId: 1, page: 2, limit: 20 })`, assert `getTrackingSources` called with `{ mangaId: 1, page: 2, limit: 20 }`
  - no-args → `useTrackingSources()`, assert `getTrackingSources` called with `{}`
  - new test: `useTrackingSources({ search: 'naruto' })` → `getTrackingSources` called with `{ search: 'naruto' }`

### 4. Error handling

None new. Query failures surface through the existing `isError`/`refetch` path in `TrackingPage`/`ManageSourcesDialog` (TanStack Query default `useQuery` behavior). No toast changes.

### 5. Backward compatibility

This is a breaking internal-API change (positional → object) — the only three call sites are updated in the same commit, so no dead code or broken callers remain. `getTrackingSources` is not consumed anywhere outside `useTracking.ts`.

## Scope Boundaries

- **In:** trackingApi.ts, useTracking.ts, useTracking.spec.tsx, TrackingPage.tsx, ManageSourcesDialog.tsx, task file MR126.md wording update (`q` → `search`, call-site requirement superseded).
- **Out:** search box UI, debounce, empty-state messaging, table changes (all MR127); backend (MR125, committed).

## Testing

- Hook tests (vitest, `useTracking.spec.tsx`): 2 converted + 1 new, asserting exact forwarded params object and distinct query keys via call args.
- No dedicated API-client test file exists for trackingApi (consistent with the other API modules) — behavior is covered through the hook tests and manual verification.

## Acceptance Criteria

- [ ] `getTrackingSources({ search })` sends `search` as a query param when truthy
- [ ] Empty/absent search produces no `?search=` in the request
- [ ] `useTrackingSources` forwards the params object and includes all fields in the query key
- [ ] `TrackingPage` and `ManageSourcesDialog` compile and behave identically after call-site conversion
- [ ] `npm run test` in `frontend/` passes; lint and prettier clean on touched files
- [ ] Manual: dev frontend loads, tracking table still paginates, manage dialog still lists sources per manga
