# MR118_1 — Frontend API Service + Hooks for Tracking Sources and Config

Date: 2026-08-02
Parent: [MR118](../../../tasks/MR118.md) — Tracking API service and React Query hooks

## Objective

Create the frontend data-fetching layer for tracking sources (CRUD) and tracking config (get/update): `frontend/src/services/api/trackingApi.ts` and `frontend/src/hooks/useTracking.ts`, plus hook unit tests. Consumed by MR119_1 (tracking page) and MR120 (manage sources dialog).

## Backend contract (verified)

**Dependency:** this task assumes MR116 (extractorPath DTO fields) has landed — the backend `forbidNonWhitelisted: true` pipe rejects unknown body keys, so the `extractorPath` payload fields require MR116 first.

- Routes have NO `/api` prefix (no `setGlobalPrefix` in `main.ts`): `GET/POST /tracking-sources`, `PATCH/DELETE /tracking-sources/:id`, `GET/PATCH /tracking-sources/config`
- `GET /tracking-sources` supports query params `mangaId?`, `page` (default 1), `limit` (default 20) → `{ data, total, page, limit, totalPages }`
- `TrackingSourceResponseDto`: `{ id, mangaId, url, name, extractorPath?, latestChapterNumber: string | null, createdAt, updatedAt }` — `extractorPath` is planned (MR116); include it in the frontend type now
- `TrackingConfigResponseDto`: `{ id, frequency, interval, runAt, updatedAt }`; `TrackingFrequency` enum values are lowercase: `daily | weekly | monthly | yearly`
- `CreateTrackingSourceDto`: `{ mangaId, url, name }` (+ optional `extractorPath` after MR116); `UpdateTrackingSourceDto`: `{ url?, name? }` (+ optional `extractorPath`)
- `DELETE` returns 204 (interceptor passes 204 responses through unmodified)

## API Service (`frontend/src/services/api/trackingApi.ts`)

Mirrors `authorApi.ts` exactly:

- Import shared `axiosInstance` from `#/services/api/api`
- Exported types (values must match backend DTOs):
  - `TrackingSourceResponse` — `{ id, mangaId, url, name, extractorPath?: string, latestChapterNumber: string | null, createdAt, updatedAt }`
  - `PaginatedTrackingSourceResponse` — `{ data: TrackingSourceResponse[], total, page, limit, totalPages }`
  - `CreateTrackingSourcePayload` — `{ mangaId: number, url: string, name: string, extractorPath?: string }`
  - `UpdateTrackingSourcePayload` — `{ url?: string, name?: string, extractorPath?: string }`
  - `TrackingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'`
  - `TrackingConfigResponse` — `{ id, frequency: TrackingFrequency, interval, runAt, updatedAt }`
  - `UpdateTrackingConfigPayload` — `{ frequency?: TrackingFrequency, interval?: number, runAt?: string }`
- Functions:
  - `getTrackingSources(mangaId?, page = 1, limit = 20)` → builds `params: Record<string, string | number> = { page, limit }`, adds `mangaId` only when defined (same pattern as `search` in `getGenres`), `axiosInstance.get<PaginatedTrackingSourceResponse>('/tracking-sources', { params })`
  - `createTrackingSource(payload)` → `post<TrackingSourceResponse>('/tracking-sources', payload)`
  - `updateTrackingSource(id, payload)` → `patch<TrackingSourceResponse>(`/tracking-sources/${id}`, payload)`
  - `deleteTrackingSource(id)` → `delete('/tracking-sources/${id}')`, returns `Promise<void>`
  - `getTrackingConfig()` → `get<TrackingConfigResponse>('/tracking-sources/config')`
  - `updateTrackingConfig(payload)` → `patch<TrackingConfigResponse>('/tracking-sources/config', payload)`

## React Query Hooks (`frontend/src/hooks/useTracking.ts`)

Mirrors `useAuthors.ts`:

- Query key factory:
  ```typescript
  const trackingKeys = {
    all: ['tracking'] as const,
    sourceList: (mangaId?: number, page?: number, limit?: number) =>
      [...trackingKeys.all, 'sources', mangaId, page, limit] as const,
    config: () => [...trackingKeys.all, 'config'] as const,
  }
  ```
- `useTrackingSources(mangaId?, page?, limit?)` → `useQuery<PaginatedTrackingSourceResponse>` with `sourceList` key and `queryFn` delegating to `getTrackingSources`
- `useTrackingConfig()` → `useQuery<TrackingConfigResponse>` with `config` key
- `useCreateTrackingSource()` → mutation on `createTrackingSource`; `onSuccess` invalidates `trackingKeys.all` + `toast.success('Source "${name}" created')`; `onError` uses the repo convention `err instanceof Error ? err.message : 'Failed to create source'`
- `useUpdateTrackingSource()` → mutation with `{ id, data }` arg; success: invalidate all + `toast.success('Source "${name}" updated')`; error toast 'Failed to update source'
- `useDeleteTrackingSource()` → mutation with `id` arg; success: invalidate all + `toast.success('Source deleted')`; error toast 'Failed to delete source'
- `useUpdateTrackingConfig()` → mutation on `updateTrackingConfig`; success: invalidate `trackingKeys.all` + `toast.success('Tracking config updated')`; error toast 'Failed to update tracking config'

## Tests (`frontend/src/hooks/useTracking.spec.tsx`)

Vitest + @testing-library/react, following `useBatchImport.spec.tsx` conventions:

- `vi.mock('#/services/api/trackingApi', ...)` — all 6 functions as `vi.fn()`
- `vi.mock('sonner', ...)` — same mock as the precedent (default + toast with loading/success/warning/error)
- `createWrapper()` helper — fresh `QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })` wrapped in `QueryClientProvider`
- `beforeEach` → `vi.clearAllMocks()`
- Test cases:
  - `useTrackingSources`: queryFn calls `getTrackingSources` with the hook args (e.g. `(1, 2, 20)`)
  - `useTrackingSources` with `undefined` params: queryFn called with defaults (page 1, limit 20)
  - `useTrackingConfig`: queryFn calls `getTrackingConfig`
  - `useCreateTrackingSource`: success → `invalidateQueries` called + success toast with created name; failure → error toast
  - `useUpdateTrackingSource`: success → invalidate + toast with updated name; failure → error toast
  - `useDeleteTrackingSource`: success → invalidate + 'Source deleted' toast; failure → error toast
  - `useUpdateTrackingConfig`: success → invalidate + 'Tracking config updated' toast; failure → error toast

## Out of scope

- Check API functions and hooks (`checkTrackingSource`, `checkMangaSources`, `checkAllSources`, `useCheck*`) — MR118_2
- Unit tests for the api module itself (no precedent in repo; hooks exercise the functions via mocks)
- Changing the error-message convention to extract `ApiErrorPayload.message` (repo-wide convention, not this task)
- `latestChapterNumber` is already part of `TrackingSourceResponse`; check-related result types come with MR118_2

## Acceptance criteria

- Types match backend DTOs; `TrackingFrequency` lowercase
- Paths have no `/api` prefix; config targets `/tracking-sources/config`
- All hooks follow `useAuthors.ts` patterns; mutations invalidate `trackingKeys.all`
- `useTracking.spec.tsx` passes (vitest)
- `npm run lint` and `npm run check` (prettier) clean for the new files
