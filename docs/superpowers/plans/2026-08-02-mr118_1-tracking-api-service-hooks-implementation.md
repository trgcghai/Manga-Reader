# MR118_1 — Frontend Tracking API Service + Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the frontend data-fetching layer for tracking sources (CRUD) and tracking config (get/update): `trackingApi.ts`, `useTracking.ts`, and hook unit tests.

**Architecture:** API module mirrors `authorApi.ts` (shared `axiosInstance` from `#/services/api/api`, no `/api` prefix in paths). Hooks mirror `useAuthors.ts` (query key factory `trackingKeys` with `all`/`sourceList`/`config`, mutations invalidate `trackingKeys.all` and show sonner toasts). Hook tests follow the `useBatchImport.spec.tsx` precedent (vitest + `renderHook`, mocked api module + mocked sonner).

**Tech Stack:** TanStack Start + React, TanStack Query, axios, vitest, @testing-library/react, sonner, TypeScript

**Process:** The API module is created first (untested by repo convention — api modules have no test precedent; the hook spec is the test layer). Task 2 is strict TDD: failing hook spec → implementation → green. Commit after each task.

**Related skills:** `tanstack-query-best-practices`, `vitest`, `react-testing-library`, `vercel-react-best-practices`, `test-driven-development`, `verification-before-completion`

---

## Current State

- `frontend/src/services/api/api.ts` exists — shared `axiosInstance` (baseURL from `VITE_API_URL`, unwraps `data` from the response envelope, passes 204 through). Import as `#/services/api/api`.
- `frontend/src/services/api/authorApi.ts` + `frontend/src/hooks/useAuthors.ts` are the pattern templates.
- `frontend/src/hooks/useBatchImport.spec.tsx` is the hook-test template (vitest, `renderHook`, `createWrapper()` with `QueryClientProvider`, `vi.mock` for api modules and sonner, `eslint-disable import/first` for post-mock imports).
- Backend routes have NO `/api` prefix: `GET/POST /tracking-sources`, `PATCH/DELETE /tracking-sources/:id`, `GET/PATCH /tracking-sources/config`. `TrackingFrequency` values are lowercase (`daily | weekly | monthly | yearly`).
- **Dependency:** `extractorPath` payload fields require MR116 to have landed (backend `forbidNonWhitelisted` pipe rejects unknown keys). If MR116 is not merged yet, keep the `extractorPath` fields in the types but do NOT send them from UI code until MR116 exists.
- Prettier config: no semicolons, single quotes. Verification: `npm run lint`, `npm run check` (prettier), `npm run test` (vitest).

---

## File Structure

**Created files:**
- `frontend/src/services/api/trackingApi.ts` — types + 6 API functions (sources CRUD + config get/update)
- `frontend/src/hooks/useTracking.ts` — `trackingKeys` factory + 6 hooks
- `frontend/src/hooks/useTracking.spec.tsx` — hook unit tests (11 tests)

No existing files are modified.

---

### Task 1: Create the tracking API service module

**Skills:** `tanstack-query-best-practices` (service layer conventions), `vercel-react-best-practices`

**Files:**
- Create: `frontend/src/services/api/trackingApi.ts`

- [ ] **Step 1: Create `trackingApi.ts`**

Create `F:\Cntt\vibe\manga-reader\frontend\src\services\api\trackingApi.ts`:

```typescript
import axiosInstance from '#/services/api/api'

export interface TrackingSourceResponse {
  id: number
  mangaId: number
  url: string
  name: string
  extractorPath?: string
  latestChapterNumber: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginatedTrackingSourceResponse {
  data: TrackingSourceResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTrackingSourcePayload {
  mangaId: number
  url: string
  name: string
  extractorPath?: string
}

export interface UpdateTrackingSourcePayload {
  url?: string
  name?: string
  extractorPath?: string
}

export type TrackingFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface TrackingConfigResponse {
  id: number
  frequency: TrackingFrequency
  interval: number
  runAt: string
  updatedAt: string
}

export interface UpdateTrackingConfigPayload {
  frequency?: TrackingFrequency
  interval?: number
  runAt?: string
}

export async function getTrackingSources(
  mangaId?: number,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedTrackingSourceResponse> {
  const params: Record<string, string | number> = { page, limit }
  if (mangaId !== undefined) params.mangaId = mangaId

  const { data } = await axiosInstance.get<PaginatedTrackingSourceResponse>(
    '/tracking-sources',
    { params },
  )
  return data
}

export async function createTrackingSource(
  payload: CreateTrackingSourcePayload,
): Promise<TrackingSourceResponse> {
  const { data } = await axiosInstance.post<TrackingSourceResponse>(
    '/tracking-sources',
    payload,
  )
  return data
}

export async function updateTrackingSource(
  id: number,
  payload: UpdateTrackingSourcePayload,
): Promise<TrackingSourceResponse> {
  const { data } = await axiosInstance.patch<TrackingSourceResponse>(
    `/tracking-sources/${id}`,
    payload,
  )
  return data
}

export async function deleteTrackingSource(id: number): Promise<void> {
  await axiosInstance.delete(`/tracking-sources/${id}`)
}

export async function getTrackingConfig(): Promise<TrackingConfigResponse> {
  const { data } = await axiosInstance.get<TrackingConfigResponse>(
    '/tracking-sources/config',
  )
  return data
}

export async function updateTrackingConfig(
  payload: UpdateTrackingConfigPayload,
): Promise<TrackingConfigResponse> {
  const { data } = await axiosInstance.patch<TrackingConfigResponse>(
    '/tracking-sources/config',
    payload,
  )
  return data
}
```

- [ ] **Step 2: Verify lint and prettier on the new file**

```bash
cd frontend && npx eslint src/services/api/trackingApi.ts
```

Expected: exit 0, no output.

```bash
cd frontend && npx prettier --check src/services/api/trackingApi.ts
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api/trackingApi.ts
git commit -m "feat: add tracking sources and config api service"
```

---

### Task 2 (TDD): Write failing hook spec → implement useTracking.ts → pass

**Skills:** `test-driven-development`, `vitest`, `react-testing-library`, `tanstack-query-best-practices`

**Files:**
- Create: `frontend/src/hooks/useTracking.spec.tsx`
- Create: `frontend/src/hooks/useTracking.ts`

- [ ] **Step 1: Write the failing hook spec**

Create `F:\Cntt\vibe\manga-reader\frontend\src\hooks\useTracking.spec.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  useTrackingSources,
  useTrackingConfig,
  useCreateTrackingSource,
  useUpdateTrackingSource,
  useDeleteTrackingSource,
  useUpdateTrackingConfig,
} from './useTracking'
import { toast } from 'sonner'

vi.mock('#/services/api/trackingApi', () => ({
  getTrackingSources: vi.fn(),
  createTrackingSource: vi.fn(),
  updateTrackingSource: vi.fn(),
  deleteTrackingSource: vi.fn(),
  getTrackingConfig: vi.fn(),
  updateTrackingConfig: vi.fn(),
}))

vi.mock('sonner', () => {
  const toastFn = vi.fn()
  toastFn.loading = vi.fn()
  toastFn.success = vi.fn()
  toastFn.warning = vi.fn()
  toastFn.error = vi.fn()
  return { default: toastFn, toast: toastFn }
})

// eslint-disable-next-line import/first
import {
  getTrackingSources,
  createTrackingSource,
  updateTrackingSource,
  deleteTrackingSource,
  getTrackingConfig,
  updateTrackingConfig,
} from '#/services/api/trackingApi'
// eslint-disable-next-line import/first
import type { Mock } from 'vitest'
// eslint-disable-next-line import/first
import type {
  PaginatedTrackingSourceResponse,
  TrackingConfigResponse,
} from '#/services/api/trackingApi'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('useTracking', () => {
  const paginatedMock: PaginatedTrackingSourceResponse = {
    data: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }

  const configMock: TrackingConfigResponse = {
    id: 1,
    frequency: 'daily',
    interval: 1,
    runAt: '00:00',
    updatedAt: new Date().toISOString(),
  }

  let invalidateSpy: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries')
    ;(getTrackingSources as Mock).mockResolvedValue(paginatedMock)
    ;(getTrackingConfig as Mock).mockResolvedValue(configMock)
  })

  describe('useTrackingSources', () => {
    it('fetches sources with the provided params', async () => {
      const { result } = renderHook(() => useTrackingSources(1, 2, 20), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.data).toEqual(paginatedMock))
      expect(getTrackingSources).toHaveBeenCalledWith(1, 2, 20)
    })

    it('passes undefined params through when called without args', async () => {
      renderHook(() => useTrackingSources(), { wrapper: createWrapper() })

      await waitFor(() =>
        expect(getTrackingSources).toHaveBeenCalledWith(
          undefined,
          undefined,
          undefined,
        ),
      )
    })
  })

  describe('useTrackingConfig', () => {
    it('fetches the tracking config', async () => {
      const { result } = renderHook(() => useTrackingConfig(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.data).toEqual(configMock))
      expect(getTrackingConfig).toHaveBeenCalled()
    })
  })

  describe('useCreateTrackingSource', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(createTrackingSource as Mock).mockResolvedValue({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'MangaDex',
        latestChapterNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const { result } = renderHook(() => useCreateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          mangaId: 1,
          url: 'https://example.com/manga/one-piece',
          name: 'MangaDex',
        })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Source "MangaDex" created')
    })

    it('shows error toast on failure', async () => {
      ;(createTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCreateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          mangaId: 1,
          url: 'https://example.com/manga/one-piece',
          name: 'MangaDex',
        }).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useUpdateTrackingSource', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(updateTrackingSource as Mock).mockResolvedValue({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'Renamed',
        latestChapterNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      const { result } = renderHook(() => useUpdateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { name: 'Renamed' },
        })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Source "Renamed" updated')
    })

    it('shows error toast on failure', async () => {
      ;(updateTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useUpdateTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { name: 'Renamed' },
        }).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useDeleteTrackingSource', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(deleteTrackingSource as Mock).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(1)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Source deleted')
    })

    it('shows error toast on failure', async () => {
      ;(deleteTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useDeleteTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(1).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useUpdateTrackingConfig', () => {
    it('invalidates queries and shows success toast', async () => {
      ;(updateTrackingConfig as Mock).mockResolvedValue(configMock)

      const { result } = renderHook(() => useUpdateTrackingConfig(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ runAt: '02:00' })
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracking'] })
      expect(toast.success).toHaveBeenCalledWith('Tracking config updated')
    })

    it('shows error toast on failure', async () => {
      ;(updateTrackingConfig as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useUpdateTrackingConfig(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync({ runAt: '02:00' }).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/hooks/useTracking.spec.tsx
```

Expected: FAIL — `Cannot find module './useTracking'` (module does not exist yet).

- [ ] **Step 3: Implement `useTracking.ts`**

Create `F:\Cntt\vibe\manga-reader\frontend\src\hooks\useTracking.ts`:

```typescript
import {
  getTrackingSources,
  createTrackingSource,
  updateTrackingSource,
  deleteTrackingSource,
  getTrackingConfig,
  updateTrackingConfig,
} from '#/services/api/trackingApi'
import type {
  PaginatedTrackingSourceResponse,
  CreateTrackingSourcePayload,
  UpdateTrackingSourcePayload,
  TrackingConfigResponse,
  UpdateTrackingConfigPayload,
} from '#/services/api/trackingApi'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const trackingKeys = {
  all: ['tracking'] as const,
  sourceList: (mangaId?: number, page?: number, limit?: number) =>
    [...trackingKeys.all, 'sources', mangaId, page, limit] as const,
  config: () => [...trackingKeys.all, 'config'] as const,
}

export function useTrackingSources(
  mangaId?: number,
  page?: number,
  limit?: number,
) {
  return useQuery<PaginatedTrackingSourceResponse>({
    queryKey: trackingKeys.sourceList(mangaId, page, limit),
    queryFn: () => getTrackingSources(mangaId, page, limit),
  })
}

export function useCreateTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTrackingSourcePayload) =>
      createTrackingSource(data),
    onSuccess: (source) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success(`Source "${source.name}" created`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create source')
    },
  })
}

export function useUpdateTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data: UpdateTrackingSourcePayload
    }) => updateTrackingSource(id, data),
    onSuccess: (source) => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success(`Source "${source.name}" updated`)
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update source')
    },
  })
}

export function useDeleteTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteTrackingSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success('Source deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete source')
    },
  })
}

export function useTrackingConfig() {
  return useQuery<TrackingConfigResponse>({
    queryKey: trackingKeys.config(),
    queryFn: () => getTrackingConfig(),
  })
}

export function useUpdateTrackingConfig() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateTrackingConfigPayload) =>
      updateTrackingConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all })
      toast.success('Tracking config updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update tracking config',
      )
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/hooks/useTracking.spec.tsx
```

Expected: PASS — 11 tests pass, 1 file.

- [ ] **Step 5: Verify lint and prettier on the new files**

```bash
cd frontend && npx eslint src/hooks/useTracking.ts src/hooks/useTracking.spec.tsx
```

Expected: exit 0, no output.

```bash
cd frontend && npx prettier --check src/hooks/useTracking.ts src/hooks/useTracking.spec.tsx
```

Expected: exit 0. (If prettier reports formatting diffs, run `npx prettier --write <file>` and re-run.)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useTracking.ts frontend/src/hooks/useTracking.spec.tsx
git commit -m "feat: add tracking sources and config react query hooks"
```

---

### Task 3: Verify full frontend suite, lint, prettier, build

**Skills:** `verification-before-completion`, `tanstack-query-best-practices`

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npm run test
```

Expected: All test files pass (existing suites + `useTracking.spec.tsx` with 11 tests).

- [ ] **Step 2: Run lint**

```bash
cd frontend && npm run lint
```

Expected: No errors in the new files (trackingApi.ts, useTracking.ts, useTracking.spec.tsx). If pre-existing lint errors exist elsewhere, note them — do not fix unrelated files.

- [ ] **Step 3: Run prettier check**

```bash
cd frontend && npm run check
```

Expected: exit 0.

- [ ] **Step 4: Run build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Verify working tree state**

```bash
git status
```

Expected: Working tree clean (all changes committed in Tasks 1–2). If anything is dirty, report it — do not commit without instruction.

---

## Self-Review Checklist

1. **Spec coverage:** all 6 API functions with correct paths (no `/api` prefix, config at `/tracking-sources/config`); `TrackingFrequency` lowercase; all 6 hooks with `trackingKeys` factory; mutations invalidate `trackingKeys.all` + toasts; 11 hook tests (2 sources + 1 config + 2 each × 4 mutations).
2. **Type consistency:** hook names match api function names (`useTrackingSources` ↔ `getTrackingSources`, etc.); `trackingKeys.sourceList(mangaId, page, limit)` signature matches `useTrackingSources` params; `useUpdateTrackingSource` mutation arg shape `{ id, data }` matches its `queryFn`-side usage and the spec's `mutateAsync({ id: 1, data: { name: 'Renamed' } })`.
3. **Convention consistency:** `err instanceof Error ? err.message : 'Failed to ...'` pattern; `toast.success` messages match spec (`Source "X" created`, `Source "X" updated`, `Source deleted`, `Tracking config updated`); spec file structure (mock order, `eslint-disable import/first`, `createWrapper`) matches `useBatchImport.spec.tsx`.
4. **Dependency:** `extractorPath` fields typed but only sent by UI code after MR116 lands (backend `forbidNonWhitelisted` rejects unknown keys).
5. **No placeholders:** every step contains concrete code or commands.
