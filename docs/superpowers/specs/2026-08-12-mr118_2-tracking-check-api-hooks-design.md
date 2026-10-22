# MR118_2 — Frontend Check API Service + Hooks: Design

Date: 2026-08-12
Parent: [MR118](../../../tasks/MR118.md) — Tracking API service and React Query hooks
Source task: `tasks/MR118_2.md`

## Objective

Add the check data-fetching layer to the MR118_1 files (`frontend/src/services/api/trackingApi.ts`, `frontend/src/hooks/useTracking.ts`): single-source, per-manga, and all-source check functions + React Query mutation hooks. Consumed by MR119_2 ("Check Now" action).

## Backend contract (verified against `tracking.controller.ts`)

Routes have NO `/api` prefix:

| Endpoint | Response |
| --- | --- |
| `POST /tracking-sources/:id/check` | `CheckResult`: `{ updated, previous?, current?, mangaId? }` |
| `POST /tracking-sources/check-manga/:mangaId` | `AggregateCheckResult[]`: `{ sourceId, sourceName, url, updated, previous?, current?, error? }` |
| `POST /tracking-sources/check-all` | `AggregateCheckResult[]` |

Aggregate endpoints always return 200 with per-source `error` fields. Single-source check can return 404 (missing source), 502 (URL unreachable), 422 (parse failure) — rejected through the axios interceptor as `ApiErrorPayload`.

## Decisions (brainstorming clarifications)

1. **Toast ownership:** hooks own **error** toasts only; success data flows through the mutation result and the UI (MR119_2) renders its own summary toast. No duplicate toasts.
2. **Approach B — narrowed cache touch-up:** check mutations never invalidate `trackingKeys.all` (per task, config query untouched). Instead, when a check finds `updated: true` results, invalidate only the `['tracking', 'sources']`-prefixed list queries so the table's `latestChapterNumber` refreshes. No updates found → zero cache writes, zero refetches.

## API Service (`frontend/src/services/api/trackingApi.ts` — add to MR118_1 file)

Exported types (values match backend shapes exactly):

```typescript
export interface CheckSourceResponse {
  updated: boolean
  previous?: string
  current?: string
  mangaId?: number
}

export interface CheckResult {
  sourceId: number
  sourceName: string
  url: string
  updated: boolean
  previous?: string
  current?: string
  error?: string
}
```

Functions, mirroring the existing file style (`const { data } = await axiosInstance...; return data`):

```typescript
export async function checkTrackingSource(id: number): Promise<CheckSourceResponse> {
  const { data } = await axiosInstance.post<CheckSourceResponse>(`/tracking-sources/${id}/check`)
  return data
}

export async function checkMangaSources(mangaId: number): Promise<CheckResult[]> {
  const { data } = await axiosInstance.post<CheckResult[]>(`/tracking-sources/check-manga/${mangaId}`)
  return data
}

export async function checkAllSources(): Promise<CheckResult[]> {
  const { data } = await axiosInstance.post<CheckResult[]>('/tracking-sources/check-all')
  return data
}
```

## React Query Hooks (`frontend/src/hooks/useTracking.ts` — add to MR118_1 file)

Extend the existing `trackingKeys` factory with a list-prefix key for the narrowed invalidation:

```typescript
const trackingKeys = {
  all: ['tracking'] as const,
  sourceList: (params = {}) => [...trackingKeys.all, 'sources', ...] as const,
  sourceLists: () => [...trackingKeys.all, 'sources'] as const,
  config: () => [...trackingKeys.all, 'config'] as const,
}
```

Three mutations, each with the same structure (shared private helper `hasUpdates(results)` checks `updated === true` on any entry):

- `useCheckTrackingSource()` — `mutationFn: (id: number) => checkTrackingSource(id)`; success: if `result.updated` → `queryClient.invalidateQueries({ queryKey: trackingKeys.sourceLists() })`; error toast `'Failed to check source'`
- `useCheckMangaSources()` — `mutationFn: (mangaId: number) => checkMangaSources(mangaId)`; success: if any `result.updated` → same narrow invalidation; error toast `'Failed to check manga sources'`
- `useCheckAllSources()` — `mutationFn: () => checkAllSources()`; success: if any `result.updated` → same narrow invalidation; error toast `'Failed to check all sources'`

Error handling matches the repo convention: `toast.error(err instanceof Error ? err.message : 'Failed to ...')`.

Never: `invalidateQueries({ queryKey: trackingKeys.all })`, no `setQueryData`, no `onMutate`/optimistic updates, no `onSuccess` success toasts (UI-owned).

## Testing (`frontend/src/hooks/useTracking.spec.tsx` — extend MR118_1 file)

Vitest + @testing-library/react, extending the existing scaffold (add the 3 functions to the `vi.mock('#/services/api/trackingApi')` factory; sonner mock already in place):

- `useCheckTrackingSource` success with `updated: true` → narrow invalidation called with `['tracking', 'sources']`; `trackingKeys.all` NOT invalidated; no success toast
- `useCheckTrackingSource` success with `updated: false` → NO invalidation at all
- `useCheckMangaSources` success with mixed results (some updated) → narrow invalidation; no success toast
- `useCheckMangaSources` success with zero updates → no invalidation
- `useCheckAllSources` success with updates → narrow invalidation; no success toast
- Error paths (all three): error toast with message; no invalidation
- Arg passthrough: `checkTrackingSource` called with id; `checkMangaSources` called with mangaId; `checkAllSources` called with no args

## Files to change

- `frontend/src/services/api/trackingApi.ts` — 2 types + 3 functions
- `frontend/src/hooks/useTracking.ts` — `sourceLists` key + 3 hooks + `hasUpdates` helper
- `frontend/src/hooks/useTracking.spec.tsx` — 9-10 new test cases

## Out of scope

- Check UI / "Check Now" action (MR119_2)
- Success summary toasts (UI-owned in MR119_2)
- Invalidation of `trackingKeys.config` or `trackingKeys.all`
- Global "Check All" UI action (explicitly out of MR119_2 scope; hook exists for future use)

## Acceptance criteria

- [ ] Types match backend shapes exactly (`CheckSourceResponse`, `CheckResult`)
- [ ] All functions use shared `axiosInstance`; paths have no `/api` prefix
- [ ] Check mutations never invalidate `trackingKeys.all` or `trackingKeys.config`
- [ ] Check mutations invalidate `['tracking', 'sources']` only when updates were found
- [ ] Hooks show error toasts only (no success toasts)
- [ ] Hooks follow `useAuthors.ts`/MR118_1 patterns
- [ ] `useTracking.spec.tsx` passes; `npm run lint` and `npm run check` clean for changed files