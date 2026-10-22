# MR119_2 — "Check Now" Action on the Tracking Sources Table — Design

**Date:** 2026-08-12
**Parent task:** MR119 (Frontend — Build tracking page with config panel and tracking sources table)
**Status:** Approved by user (2026-08-12)

## Goal

Add a per-row "Check Now" action to the tracking sources table built in MR119_1, consuming the MR118_2 `useCheckMangaSources` hook. Per-manga checking only; a global "Check All" action is out of scope.

## Decisions (user-confirmed)

1. **Mutation ownership:** A self-contained `CheckNowButton` component owns `useCheckMangaSources` per row. This matches how `ManageSourcesDialog`/`CreateTrackingSourceDialog` already own their hooks inside `TrackingPage`, and keeps `TrackingPage.tsx` unchanged.
2. **Duplicate manga rows:** Multiple source rows may share a `mangaId` (the check endpoint is per-manga). Each row's button is fully independent — duplicate clicks run duplicate checks; checks are read-only so concurrency is harmless. No cross-row coordination.
3. **Toast ownership (from MR118_2 spec):** the hook shows error toasts automatically; the UI owns the success toast.

## Files

- Create: `frontend/src/components/tracking/CheckNowButton.tsx`
- Create: `frontend/src/components/tracking/CheckNowButton.spec.tsx`
- Modify: `frontend/src/components/tracking/TrackingSourcesTable.tsx` (Actions cell)
- Modify: `frontend/src/components/tracking/TrackingSourcesTable.spec.tsx` (mock hook + render assertions)

> Note: the MR119_2 task text references `MangaTrackingTable.tsx`, but MR119_1's actual file is `TrackingSourcesTable.tsx` (also per `MR119.md`). The task's filename is stale.

## Component design

`CheckNowButton({ mangaId }: { mangaId: number })`:

- Calls `useCheckMangaSources()` from `#/hooks/useTracking`
- On click: `mutation.mutate(mangaId, { onSuccess })` — the per-call `onSuccess` gives the raw `CheckResult[]` (hook's own `onSuccess` handles cache refresh; hook's `onError` handles error toasts)
- Success toast: `toast.success(\`${updatedCount} of ${results.length} sources updated\`)` where `updatedCount = results.filter(r => r.updated).length` — shown on every successful check, including "0 of N"
- Renders `Button variant="outline" size="sm"`, `disabled={mutation.isPending}`
- Icon: `RefreshCw` (h-4 w-4) idle → `Loader2` (size-4 animate-spin) while pending; text "Check now" always visible so the button does not change width

## Table integration

In `TrackingSourcesTable.tsx`, the Actions cell becomes a flex row (`flex items-center gap-2`) containing, per row:

1. `<CheckNowButton mangaId={source.mangaId} />`
2. Existing "View sources" button (unchanged)

Existing table behavior (search, pagination, loading/empty/error states, `onManage`) is unaffected.

## Data flow

1. Click → `checkMangaSources(mangaId)` via MR118_2 hook
2. Mutation success → toast.success summary in the button component; if any result `updated === true`, the hook invalidates `['tracking', 'sources']`-prefixed queries → `useTrackingSources` refetches → "Last Checked" column updates automatically (no extra code)
3. Mutation error → `toast.error` from the hook (already implemented in MR118_2)

## Testing (Vitest, repo conventions)

`CheckNowButton.spec.tsx` (mock `#/hooks/useTracking` → `useCheckMangaSources`):
- Click calls `mutate` with the row's `mangaId`
- While pending: shows `Loader2` spinner and button is disabled
- Success: `toast.success` called with "2 of 3 sources updated" (mock resolves mixed `updated` flags)
- Success with 0 updates: "0 of 2 sources updated"
- Error: hook handles the toast (assert no crash/throw on rejection is optional; hook behavior already covered by MR118_2 tests)

`TrackingSourcesTable.spec.tsx`:
- Add `vi.mock('#/hooks/useTracking', ...)` stubbing `useCheckMangaSources` (the table spec currently has no `QueryClientProvider`, so the hook must be mocked)
- Assert a "Check now" button renders per data row alongside "View sources"
- Existing tests unchanged

## Out of scope

- Global "Check All" action/UI
- Per-source error UI (summary toast suffices per task)
- Changes to `TrackingPage.tsx`, `useTracking.ts`, `trackingApi.ts`
- The stale filename in `tasks/MR119_2.md` (cosmetic; may be fixed when the task moves to done)