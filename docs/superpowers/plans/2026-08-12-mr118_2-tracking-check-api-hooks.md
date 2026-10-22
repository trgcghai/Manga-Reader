# MR118_2 — Tracking Check API + Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the check data layer (3 API functions + 3 React Query mutation hooks) to the existing MR118_1 tracking files, with narrowed cache refresh when a check finds updates.

**Architecture:** Extends `frontend/src/services/api/trackingApi.ts` with `checkTrackingSource`/`checkMangaSources`/`checkAllSources` (shared `axiosInstance`, no `/api` prefix, shapes matching the backend `CheckResult`/`AggregateCheckResult`). Extends `frontend/src/hooks/useTracking.ts` with three mutations and a `sourceLists` query key; on success, mutations invalidate only `['tracking', 'sources']`-prefixed queries when any result `updated === true` — never `trackingKeys.all` or config. Hooks own error toasts only; success flows through the mutation result to the UI.

**Tech Stack:** TanStack Query v5 (`useMutation`, `useQueryClient`), axios, sonner, Vitest + @testing-library/react, TypeScript path alias `#/services/api/api`.

**Branch:** work proceeds on the current branch (`sprint06`) like prior MRs.

---

### Task 1: Check API functions (`trackingApi.ts`)

**Files:**
- Modify: `frontend/src/services/api/trackingApi.ts` (append at end, after `updateTrackingConfig`)
- Test: none (repo has no api-layer unit-test precedent; hooks tests in Task 2 exercise these functions via mocks)

**Related skills:** javascript-typescript-jest (none — no tests here), tanstack-query-best-practices (naming/shape discipline), frontend-design (n/a — data layer only)

- [ ] **Step 1: Add the two exported interfaces**

Append after line 120 (end of `updateTrackingConfig`):

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

- [ ] **Step 2: Add the three exported functions**

```typescript
export async function checkTrackingSource(
  id: number,
): Promise<CheckSourceResponse> {
  const { data } = await axiosInstance.post<CheckSourceResponse>(
    `/tracking-sources/${id}/check`,
  )
  return data
}

export async function checkMangaSources(
  mangaId: number,
): Promise<CheckResult[]> {
  const { data } = await axiosInstance.post<CheckResult[]>(
    `/tracking-sources/check-manga/${mangaId}`,
  )
  return data
}

export async function checkAllSources(): Promise<CheckResult[]> {
  const { data } = await axiosInstance.post<CheckResult[]>(
    '/tracking-sources/check-all',
  )
  return data
}
```

- [ ] **Step 3: Verify typecheck + format**

Run in `frontend/`:

```
npx tsc --noEmit
npm run check
```

Expected: no errors. (`axiosInstance` and the response-unwrapping interceptor are already in `#/services/api/api`; paths intentionally have no `/api` prefix.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api/trackingApi.ts
git commit -m "feat: add tracking check api functions"
```

### Task 2: Check hooks + narrowed cache refresh (TDD)

**Files:**
- Modify: `frontend/src/hooks/useTracking.ts` (keys factory + 3 hooks + helper)
- Modify: `frontend/src/hooks/useTracking.spec.tsx` (mock factory + new describe blocks)

**Related skills:** test-driven-development, vitest, javascript-typescript-jest, react-testing-library, tanstack-query-best-practices

- [ ] **Step 1: Write the failing tests**

In `frontend/src/hooks/useTracking.spec.tsx`:

1. Add the 3 functions to the `vi.mock('#/services/api/trackingApi')` factory (after `updateTrackingConfig: vi.fn(),` on line 20):

```typescript
  checkTrackingSource: vi.fn(),
  checkMangaSources: vi.fn(),
  checkAllSources: vi.fn(),
```

2. Extend the import list (after `updateTrackingConfig` on line 40):

```typescript
import {
  getTrackingSources,
  createTrackingSource,
  updateTrackingSource,
  deleteTrackingSource,
  getTrackingConfig,
  updateTrackingConfig,
  checkTrackingSource,
  checkMangaSources,
  checkAllSources,
} from '#/services/api/trackingApi'
```

3. Extend the hook import list (lines 4-11) with the three new hooks.

4. Add these describe blocks BEFORE the closing `})` of the outer `describe('useTracking', ...)` (before line 287):

```typescript
  describe('useCheckTrackingSource', () => {
    it('passes the id and invalidates source lists when updated', async () => {
      ;(checkTrackingSource as Mock).mockResolvedValue({
        updated: true,
        previous: '100',
        current: '101',
        mangaId: 1,
      })

      const { result } = renderHook(() => useCheckTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7)
      })

      expect(checkTrackingSource).toHaveBeenCalledWith(7)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['tracking', 'sources'],
      })
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not invalidate when nothing updated', async () => {
      ;(checkTrackingSource as Mock).mockResolvedValue({
        updated: false,
        current: '101',
      })

      const { result } = renderHook(() => useCheckTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7)
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      ;(checkTrackingSource as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCheckTrackingSource(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(7).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
      expect(invalidateSpy).not.toHaveBeenCalled()
    })
  })

  describe('useCheckMangaSources', () => {
    it('passes the mangaId and invalidates source lists when some sources updated', async () => {
      ;(checkMangaSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: false },
      ])

      const { result } = renderHook(() => useCheckMangaSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(3)
      })

      expect(checkMangaSources).toHaveBeenCalledWith(3)
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['tracking', 'sources'],
      })
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not invalidate when zero sources updated', async () => {
      ;(checkMangaSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false },
      ])

      const { result } = renderHook(() => useCheckMangaSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(3)
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      ;(checkMangaSources as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCheckMangaSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync(3).catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })

  describe('useCheckAllSources', () => {
    it('invalidates source lists when some sources updated', async () => {
      ;(checkAllSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
      ])

      const { result } = renderHook(() => useCheckAllSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(checkAllSources).toHaveBeenCalledWith()
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['tracking', 'sources'],
      })
      expect(toast.success).not.toHaveBeenCalled()
    })

    it('does not invalidate when zero sources updated', async () => {
      ;(checkAllSources as Mock).mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false },
      ])

      const { result } = renderHook(() => useCheckAllSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync()
      })

      expect(invalidateSpy).not.toHaveBeenCalled()
    })

    it('shows error toast on failure', async () => {
      ;(checkAllSources as Mock).mockRejectedValue(new Error('boom'))

      const { result } = renderHook(() => useCheckAllSources(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.mutateAsync().catch(() => {})
      })

      expect(toast.error).toHaveBeenCalledWith('boom')
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run in `frontend/`:

```
npx vitest run src/hooks/useTracking.spec.tsx
```

Expected: FAIL — suite fails to import `useCheckTrackingSource` etc. (`SyntaxError`/`Cannot find name`-style errors). This is the red phase.

- [ ] **Step 3: Implement the hooks**

In `frontend/src/hooks/useTracking.ts`:

1. Extend the import from `#/services/api/trackingApi` (lines 1-8) with `checkTrackingSource, checkMangaSources, checkAllSources`, and the type import (lines 9-16) with `CheckSourceResponse, CheckResult`.

2. Add the `sourceLists` key to the factory (after `config` on line 31-32):

```typescript
  sourceLists: () => [...trackingKeys.all, 'sources'] as const,
```

3. Add a module-level helper after the key factory (after line 32):

```typescript
function hasUpdates(results: CheckResult[] | CheckSourceResponse): boolean {
  if (Array.isArray(results)) {
    return results.some((result) => result.updated)
  }
  return results.updated
}
```

4. Append the three hooks at the end of the file:

```typescript
export function useCheckTrackingSource() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => checkTrackingSource(id),
    onSuccess: (result) => {
      if (hasUpdates(result)) {
        queryClient.invalidateQueries({ queryKey: trackingKeys.sourceLists() })
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to check source',
      )
    },
  })
}

export function useCheckMangaSources() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mangaId: number) => checkMangaSources(mangaId),
    onSuccess: (results) => {
      if (hasUpdates(results)) {
        queryClient.invalidateQueries({ queryKey: trackingKeys.sourceLists() })
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to check manga sources',
      )
    },
  })
}

export function useCheckAllSources() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => checkAllSources(),
    onSuccess: (results) => {
      if (hasUpdates(results)) {
        queryClient.invalidateQueries({ queryKey: trackingKeys.sourceLists() })
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to check all sources',
      )
    },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/hooks/useTracking.spec.tsx
```

Expected: PASS — all suites green (existing 20 + new 9 tests). Then run the full hook test dir to confirm no regressions:

```
npx vitest run src/hooks
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useTracking.ts frontend/src/hooks/useTracking.spec.tsx
git commit -m "feat: add tracking check hooks with narrowed cache refresh"
```

### Task 3: Full verification

**Files:** none (verification only)

**Related skills:** verification-before-completion

- [ ] **Step 1: Run frontend checks**

Run in `frontend/`:

```
npm run lint
npm run check
npm run test
npm run build
```

Expected: lint and check clean for the changed files (note: repo may have pre-existing lint issues in unrelated files — `git stash` isolation check: run `npm run lint` and compare against the pre-MR118_2 baseline if issues appear); full test suite green; build succeeds.

- [ ] **Step 2: Confirm acceptance criteria**

Verify in the diff of the two commits:
- [ ] Types match backend shapes exactly (`CheckSourceResponse`, `CheckResult` per `tracking.service.ts` `CheckResult`/`AggregateCheckResult`)
- [ ] All functions use shared `axiosInstance`; paths have no `/api` prefix
- [ ] No `invalidateQueries({ queryKey: trackingKeys.all })` or config invalidation anywhere in the new hooks
- [ ] `['tracking', 'sources']` invalidation fires ONLY when updates found
- [ ] Error toasts exist; zero success toasts in hooks
- [ ] Hooks follow the MR118_1/`useAuthors.ts` patterns

## Out of scope (from spec)

- Check UI / "Check Now" action (MR119_2)
- Success summary toasts (UI-owned in MR119_2)
- Global "Check All" UI action
- Changes to `trackingApi.ts` beyond the three functions + two types

## Self-review notes

- `sourceLists()` = `['tracking', 'sources']` is a strict prefix of every `sourceList(params)` key (`['tracking', 'sources', mangaId, page, limit, search]`) and of nothing else — TanStack Query types it `QueryKey`, invalidating exactly the list queries.
- `hasUpdates` is deliberately lenient (any `updated: true`), matching the spec; per-source `error` results with `updated: false` do not trigger refresh (no chapter data changed).
- Test assertions mirror the existing `invalidateSpy`/`toast` spy conventions in the file; `toast.success` never fires in check tests, enforcing the toast-ownership decision.