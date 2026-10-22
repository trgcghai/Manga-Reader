# Add Source Button Wiring (MR123) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a page-level "Add Source" button to the Tracking page header that opens the Create Tracking Source dialog (MR122) via conditional mount, fixing the empty-table dead-end where no first source could ever be created.

**Architecture:** `TrackingPage` gains a `createOpen: boolean` state alongside the existing `manageSource` state. The header becomes a `flex items-center justify-between` row (translators.tsx convention) with the existing title block left and a solid `Plus`-icon "Add Source" button right. The dialog is conditionally mounted `{createOpen && <CreateTrackingSourceDialog open .../>}` — unmount-on-close resets the dialog to fresh state (MR122's no-reset design depends on this). Table refresh after creation is automatic via the hook's `trackingKeys.all` invalidation.

**Tech Stack:** React + TypeScript, shadcn/ui `Button`, `lucide-react` `Plus` icon, existing `CreateTrackingSourceDialog` (MR122).

**Spec:** `docs/superpowers/specs/2026-08-03-mr123-add-source-button-wiring-design.md`
**Task file:** `tasks/MR123.md`

**Baseline note:** the repo has pre-existing `npx tsc --noEmit` errors in unrelated files (~31). The pass criterion is ZERO errors in `src/components/tracking/`. Do NOT fix the baseline. `npm run lint` and `npm run check` fail repo-wide pre-existing; lint/prettier scoped to the touched file only.

---

### Task 1: Wire the Add Source button + conditional dialog mount in TrackingPage

**Files:**
- Modify: `frontend/src/components/tracking/TrackingPage.tsx`

**Skills:** frontend-design (header action-button placement and icon treatment matching the translators page convention), shadcn (shadcn/ui `Button` usage — verify `variant` defaults to solid, icon sizing), vercel-react-best-practices (controlled state placement: `createOpen` alongside `manageSource`, no extra re-renders).

- [ ] **Step 1: Read the current TrackingPage**

Read `frontend/src/components/tracking/TrackingPage.tsx` — it should match the "before" content in Step 2 (commits 545ecb8 + 7ae65ac, MR119_1/MR120). Also read `frontend/src/routes/admin/translators.tsx` (lines ~71-76) to see the `flex items-center justify-between` header + solid Button + Plus icon convention.

- [ ] **Step 2: Apply the change**

The complete modified file (`frontend/src/components/tracking/TrackingPage.tsx`) must be exactly:

```tsx
import { useEffect, useState } from 'react'
import {
  useTrackingConfig,
  useTrackingSources,
  useUpdateTrackingConfig,
} from '#/hooks/useTracking'
import type { UpdateTrackingConfigPayload } from '#/services/api/trackingApi'
import { Button } from '#/components/ui/button'
import { Plus } from 'lucide-react'
import { TrackingConfigPanel } from './TrackingConfigPanel'
import { TrackingSourcesTable } from './TrackingSourcesTable'
import { ManageSourcesDialog } from './ManageSourcesDialog'
import { CreateTrackingSourceDialog } from './CreateTrackingSourceDialog'

export function TrackingPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [manageSource, setManageSource] = useState<{
    mangaId: number
    mangaTitle: string
  } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: config, isLoading: configLoading } = useTrackingConfig()
  const {
    data: sources,
    isLoading,
    isError,
    refetch,
  } = useTrackingSources(undefined, page, pageSize)
  const updateConfigMutation = useUpdateTrackingConfig()

  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const handleSaveConfig = (payload: UpdateTrackingConfigPayload) => {
    updateConfigMutation.mutate(payload)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage tracking sources and schedule automatic chapter checks.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Source
        </Button>
      </div>

      <TrackingConfigPanel
        key={`${config?.id}-${config?.updatedAt}`}
        config={config}
        isLoading={configLoading}
        isSaving={updateConfigMutation.isPending}
        onSave={handleSaveConfig}
      />

      <TrackingSourcesTable
        data={sources}
        isLoading={isLoading}
        isError={isError}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRetry={() => refetch()}
        onManage={(source) =>
          setManageSource({
            mangaId: source.mangaId,
            mangaTitle: source.manga?.title ?? `Manga #${source.mangaId}`,
          })
        }
      />

      {manageSource && (
        <ManageSourcesDialog
          mangaId={manageSource.mangaId}
          mangaTitle={manageSource.mangaTitle}
          open
          onOpenChange={(open) => {
            if (!open) setManageSource(null)
          }}
        />
      )}

      {createOpen && (
        <CreateTrackingSourceDialog
          open
          onOpenChange={(open) => {
            if (!open) setCreateOpen(false)
          }}
        />
      )}
    </div>
  )
}
```

Only differences from the current file:
1. New imports: `Button` from `#/components/ui/button`, `Plus` from `lucide-react`, `CreateTrackingSourceDialog` from `./CreateTrackingSourceDialog`
2. New state: `const [createOpen, setCreateOpen] = useState(false)` after `manageSource`
3. Header `<div>` gains `className="flex items-center justify-between"`, wraps the existing title block in an inner `<div>`, adds the Button after it
4. New conditional mount block after the `manageSource` block

Do NOT change anything else (config panel, table props, pagination, manageSource flow).

- [ ] **Step 3: Typecheck — zero new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: NO errors mentioning `src/components/tracking/TrackingPage.tsx` or `src/components/tracking/`. Pre-existing errors in unrelated files (~31, incl. `src/hooks/useTracking.spec.tsx`) are the known baseline — do NOT fix them.

- [ ] **Step 4: Lint and format**

Run from `frontend/`:
- `npx eslint src/components/tracking/TrackingPage.tsx` → expected exit 0
- `npx prettier --check src/components/tracking/TrackingPage.tsx` → expected clean; if it fails, run `npx prettier --write` and re-check

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/tracking/TrackingPage.tsx
git commit -m "feat: open create source dialog from tracking page header"
```

Expected: commit succeeds, only that file staged. `git status --short` clean after.

---

### Task 2: Whole-MR verification

**Files:** none (verification only)

**Skills:** verification-before-completion (run every verification command and record real output before claiming completion — evidence before assertions), requesting-code-review (final review pass before wrapping the MR), tanstack-query-best-practices (sanity-check: no manual refetch needed after creation — `trackingKeys.all` invalidation covers the table).

- [ ] **Step 1: Typecheck scope**

Run from `frontend/`: `npx tsc --noEmit`

Expected: zero errors in `src/components/tracking/`. Record the pre-existing baseline count elsewhere (should be unchanged from before this MR).

- [ ] **Step 2: Lint + prettier**

Run from `frontend/`:
- `npx eslint src/components/tracking/TrackingPage.tsx` → exit 0
- `npx prettier --check src/components/tracking/TrackingPage.tsx` → clean

- [ ] **Step 3: Build**

Run from `frontend/`: `npm run build`

Expected: exit 0, `✓ built in ...`.

- [ ] **Step 4: Existing test suite**

Run from `frontend/`: `npm run test`

Expected: 5 files / 58 tests passed, exit 0. (No new tests — user decision for this MR.)

- [ ] **Step 5: Manual sanity check (dev server)**

With `npm run dev` + backend running, open the admin Tracking page in the browser and verify:
- "Add Source" button visible in the header even when the sources table is empty
- Clicking opens the Create Tracking Source dialog (fresh state: no manga selected, empty form)
- Create flow works: search/select manga → fill name/url → Create → "Saving..." → success toast → dialog closes
- Tracking sources table shows the new row after close
- Reopening the dialog shows fresh state (no stale manga/name/url)
- Per-row "Manage" flow still works (ManageSourcesDialog unchanged)

No code changes in this step; if anything unexpected appears, stop and report as DONE_WITH_CONCERNS with details.

- [ ] **Step 6: Final tree check**

Run `git status --short` from F:\Cntt\vibe\manga-reader — clean (or only gitignored files: tasks/, docs/superpowers/). Nothing else to commit.

---

## Final Gate

- MR123 spec checklist: all acceptance criteria in `tasks/MR123.md` satisfied — button in header, visible with empty table, opens dialog, close unmounts + resets, reopen fresh, no new typecheck/lint/format errors, existing flows untouched.
- Whole-MR code review (subagent-driven flow) before marking the MR done.
