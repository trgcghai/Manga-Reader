# MR119_2 — "Check Now" Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-row "Check Now" action to the tracking sources table (`TrackingSourcesTable.tsx`) using the MR118_2 `useCheckMangaSources` hook, with a success toast summarizing how many sources updated.

**Architecture:** A self-contained `CheckNowButton` component (in `frontend/src/components/tracking/`) owns `useCheckMangaSources` per row and renders the check toast on success; the table's Actions cell composes it with the existing "View sources" button. Error toasts and cache refresh already live in the MR118_2 hook — no UI code needed for them.

**Tech Stack:** React 19 + TanStack Start, TanStack Query v5 (`useMutation` per-call `onSuccess`), lucide-react icons, sonner toasts, Vitest + @testing-library/react + user-event, TypeScript path alias `#/hooks/useTracking`, `#/services/api/trackingApi`, `#/components/ui/button`.

**Branch:** work proceeds on the current branch (`sprint06`) like prior MRs.

**Spec:** `docs/superpowers/specs/2026-08-12-mr119_2-check-now-action-design.md`

---

### Task 1: `CheckNowButton` component (TDD)

**Files:**
- Create: `frontend/src/components/tracking/CheckNowButton.tsx`
- Create: `frontend/src/components/tracking/CheckNowButton.spec.tsx`

**Related skills:** test-driven-development, vitest, javascript-typescript-jest, react-testing-library

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/tracking/CheckNowButton.spec.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CheckNowButton } from './CheckNowButton'
import { useCheckMangaSources } from '#/hooks/useTracking'
import { toast } from 'sonner'
import type { Mock } from 'vitest'

vi.mock('#/hooks/useTracking', () => ({
  useCheckMangaSources: vi.fn(),
}))

vi.mock('sonner', () => {
  const toastFn = Object.assign(vi.fn(), {
    loading: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  })
  return { default: toastFn, toast: toastFn }
})

describe('CheckNowButton', () => {
  let mutateMock: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mutateMock = vi.fn()
    ;(useCheckMangaSources as Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: false,
    })
  })

  it('calls the check mutation with the row mangaId on click', async () => {
    const user = userEvent.setup()
    render(<CheckNowButton mangaId={42} />)

    await user.click(screen.getByRole('button', { name: 'Check now' }))

    expect(mutateMock).toHaveBeenCalledWith(42, expect.any(Object))
  })

  it('shows a spinner and disables the button while pending', () => {
    ;(useCheckMangaSources as Mock).mockReturnValue({
      mutate: mutateMock,
      isPending: true,
    })

    const { container } = render(<CheckNowButton mangaId={1} />)

    const button = screen.getByRole('button', { name: 'Check now' })
    expect(button).toBeDisabled()
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('shows a summary toast with the updated count on success', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_mangaId: number, options: unknown) => {
      ;(options as { onSuccess: (results: unknown[]) => void }).onSuccess([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: true },
        { sourceId: 3, sourceName: 'C', url: 'u', updated: false },
      ])
    })

    render(<CheckNowButton mangaId={1} />)
    await user.click(screen.getByRole('button', { name: 'Check now' }))

    expect(toast.success).toHaveBeenCalledWith('2 of 3 sources updated')
  })

  it('shows a 0 of N summary when no sources were updated', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_mangaId: number, options: unknown) => {
      ;(options as { onSuccess: (results: unknown[]) => void }).onSuccess([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: false },
      ])
    })

    render(<CheckNowButton mangaId={1} />)
    await user.click(screen.getByRole('button', { name: 'Check now' }))

    expect(toast.success).toHaveBeenCalledWith('0 of 2 sources updated')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run in `frontend/`:

```
npx vitest run src/components/tracking/CheckNowButton.spec.tsx
```

Expected: FAIL — `Cannot find module './CheckNowButton'` (red phase).

- [ ] **Step 3: Write minimal implementation**

Create `frontend/src/components/tracking/CheckNowButton.tsx`:

```typescript
import { Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { useCheckMangaSources } from '#/hooks/useTracking'
import type { CheckResult } from '#/services/api/trackingApi'

interface CheckNowButtonProps {
  mangaId: number
}

export function CheckNowButton({ mangaId }: CheckNowButtonProps) {
  const mutation = useCheckMangaSources()

  const handleClick = () => {
    mutation.mutate(mangaId, {
      onSuccess: (results: CheckResult[]) => {
        const updatedCount = results.filter((result) => result.updated).length
        toast.success(`${updatedCount} of ${results.length} sources updated`)
      },
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={handleClick}
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Check now
    </Button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx vitest run src/components/tracking/CheckNowButton.spec.tsx
```

Expected: PASS — 4/4 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tracking/CheckNowButton.tsx frontend/src/components/tracking/CheckNowButton.spec.tsx
git commit -m "feat: add Check Now button component"
```

### Task 2: Integrate into the tracking sources table

**Files:**
- Modify: `frontend/src/components/tracking/TrackingSourcesTable.tsx` (Actions cell, lines 175-184)
- Modify: `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx` (mock + new test)

**Related skills:** react-testing-library, vitest, javascript-typescript-jest, frontend-design

- [ ] **Step 1: Write the failing test**

In `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx`:

1. Add a hook mock after the existing `vi.mock('@tanstack/react-router', ...)` block (lines 7-9) — the table spec has no `QueryClientProvider`, so `useCheckMangaSources` must be stubbed:

```typescript
vi.mock('#/hooks/useTracking', () => ({
  useCheckMangaSources: () => ({ mutate: vi.fn(), isPending: false }),
}))
```

2. Add a test inside the outer `describe('TrackingSourcesTable', ...)` (before the closing `})` on line 196):

```typescript
  it('renders a Check now button next to View sources for each row', () => {
    renderTable({ data: mockPage })

    expect(
      screen.getByRole('button', { name: 'Check now' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View sources' }),
    ).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run in `frontend/`:

```
npx vitest run src/components/tracking/TrackingSourcesTable.spec.tsx
```

Expected: FAIL — `Unable to find role "button" with name "Check now"` (red phase).

- [ ] **Step 3: Implement the integration**

In `frontend/src/components/tracking/TrackingSourcesTable.tsx`:

1. Add the import after the existing lucide-react import (line 3):

```typescript
import { CheckNowButton } from './CheckNowButton'
```

2. Replace the Actions cell content (lines 175-184) so the button row is a flex group with "Check now" first, then the unchanged "View sources" button:

```typescript
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CheckNowButton mangaId={source.mangaId} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onManage(source)}
                      >
                        <Eye className="h-4 w-4" />
                        View sources
                      </Button>
                    </div>
                  </TableCell>
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run src/components/tracking/TrackingSourcesTable.spec.tsx
npx vitest run src/components/tracking/CheckNowButton.spec.tsx
```

Expected: PASS — table spec (all existing + 1 new) and button spec 4/4.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tracking/TrackingSourcesTable.tsx frontend/src/components/tracking/TrackingSourcesTable.spec.tsx
git commit -m "feat: add Check Now action to tracking sources table"
```

### Task 3: Full verification

**Files:** none (verification only)

**Related skills:** verification-before-completion

- [ ] **Step 1: Run the tracking component tests**

Run in `frontend/`:

```
npx vitest run src/components/tracking
```

Expected: PASS — all tracking suites (table, button, page, dialogs) green.

- [ ] **Step 2: Run lint on the four touched files**

```
npx eslint src/components/tracking/CheckNowButton.tsx src/components/tracking/CheckNowButton.spec.tsx src/components/tracking/TrackingSourcesTable.tsx src/components/tracking/TrackingSourcesTable.spec.tsx
```

Expected: no output (clean). Note: repo-wide `npm run lint` has pre-existing errors in unrelated files — ignore those.

- [ ] **Step 3: Run typecheck on the touched files**

```
npx tsc --noEmit 2>&1 | Select-String "tracking/CheckNowButton|tracking/TrackingSourcesTable"
```

Expected: no matches. (Repo has ~37 pre-existing tsc errors in unrelated files — ignore those.)

- [ ] **Step 4: Run the full frontend test suite and build**

```
npm run test
npm run build
```

Expected: full suite green (82+ existing tests, now including the new ones); build exit 0.

- [ ] **Step 5: Confirm acceptance criteria (from spec/task)**

Verify in the diff of the two commits:
- [ ] "Check Now" button on each row (outline, sm)
- [ ] Button triggers `useCheckMangaSources` with the row's mangaId
- [ ] `Loader2` spinner while pending; button disabled while pending
- [ ] Success toast `"X of Y sources updated"` (including "0 of N")
- [ ] Error toast handled by the hook (no extra UI code)
- [ ] `RefreshCw` icon from lucide-react
- [ ] Existing table behavior (search, pagination, states, View sources) unchanged — existing tests untouched
- [ ] `TrackingPage.tsx` unchanged

## Out of scope (from spec)

- Global "Check All" action/UI
- Per-source error UI
- Changes to `TrackingPage.tsx`, `useTracking.ts`, `trackingApi.ts`
- The stale `MangaTrackingTable.tsx` filename in `tasks/MR119_2.md` (may be fixed when the task file moves to done)

## Self-review notes

- Error path needs no UI code: MR118_2's `useCheckMangaSources` already fires `toast.error` in its own `onError`; the component only passes a per-call `onSuccess`.
- Success toast fires on every successful check (including 0 updates) — per design decision; `CheckResult[]` arrives via the mutation's per-call `onSuccess` (the hook itself doesn't toast success).
- When updates are found, MR118_2 invalidates `['tracking', 'sources']` → `useTrackingSources` refetches → "Last Checked" column refreshes with no extra code.
- The table spec's new hook mock returns a stable `{ mutate: vi.fn(), isPending: false }`; existing tests don't render the Actions cell's button state, so none of them break.
- `expect.any(Object)` on the mutate call covers the per-call options argument without over-constraining it.