# MR120 Manage Sources Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `ManageSourcesDialog` for CRUD on tracking sources per manga, opened by the "Manage" button on the tracking page (MR119_1), using a shared inline `SourceForm` for add/edit and the existing `DeleteConfirmDialog` for delete.

**Architecture:** `TrackingPage` holds `manageSource` state and conditionally mounts the dialog (query runs only while open). `ManageSourcesDialog` is self-contained: fetches via `useTrackingSources(mangaId)`, uses the three MR118_1 mutations (which own toasts + `trackingKeys.all` invalidation), and renders `SourceForm` (shared add/edit) + `DeleteConfirmDialog`. `TrackingSourcesTable` is unchanged — it already forwards the clicked source via `onManage`.

**Tech Stack:** React 19, TanStack Start Router, TanStack Query v5, shadcn/ui (Dialog, Button, Input, Skeleton, Empty, ErrorDisplay, Field), lucide-react.

**Design doc:** `docs/superpowers/specs/2026-08-02-mr120-manage-sources-dialog-design.md`
**Task file:** `tasks/MR120.md` (adjusted: `SourceForm` replaces two form files; extractorPath omitted from forms; change target is `TrackingPage.tsx`)

---

## Prerequisites (verify once, before Task 1)

- [ ] `frontend/src/hooks/useTracking.ts` exports `useTrackingSources(mangaId?, page?, limit?)`, `useCreateTrackingSource()`, `useUpdateTrackingSource()`, `useDeleteTrackingSource()` (MR118_1, merged).
- [ ] `frontend/src/components/tracking/TrackingPage.tsx` has the `onManage={() => undefined}` stub (MR119_1).
- [ ] `frontend/src/components/tracking/TrackingSourcesTable.tsx` calls `onManage(source)` with the full `TrackingSourceResponse` on Manage click (MR119_1).
- [ ] `frontend/src/components/common/DeleteConfirmDialog.tsx` exists with props `{ open, onOpenChange, title, entityName, onConfirm, isPending? }`.
- [ ] Run `npx tsc --noEmit` in `frontend/` and record the pre-existing baseline (expect ~31 errors in unrelated files — this is the KNOWN baseline; do NOT fix them).

---

### Task 1: Create `SourceForm`

Shared inline form used by both Add and Edit. Presentational — receives values and callbacks from `ManageSourcesDialog`. Initialized from `initialValues` via `useState`; the parent remounts it with a `key` to re-initialize (see Task 2).

**Skills:** `frontend-design` (form layout per existing admin dialogs — Field/Input/Button composition), `verification-before-completion` (verification steps).

**Files:**
- Create: `frontend/src/components/tracking/SourceForm.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/tracking/SourceForm.tsx` with exactly this content:

```tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Field, FieldContent, FieldLabel } from '#/components/ui/field'

export interface SourceFormValues {
  name: string
  url: string
}

interface SourceFormProps {
  initialValues: SourceFormValues
  submitLabel: string
  isPending: boolean
  onSubmit: (values: SourceFormValues) => void
  onCancel: () => void
}

export function SourceForm({
  initialValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: SourceFormProps) {
  const [name, setName] = useState(initialValues.name)
  const [url, setUrl] = useState(initialValues.url)

  const canSubmit = name.trim() !== '' && url.trim() !== '' && !isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ name, url })
  }

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <Field>
        <FieldLabel htmlFor="source-name">Name</FieldLabel>
        <FieldContent>
          <Input
            id="source-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSubmit()
            }}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="source-url">URL</FieldLabel>
        <FieldContent>
          <Input
            id="source-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSubmit()
            }}
          />
        </FieldContent>
      </Field>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  )
}
```

Notes:
- No extractorPath field (backend rejects it — see design doc).
- Save disabled when name or url is empty/whitespace or the mutation is pending.
- Enter key submits, mirroring `AddAuthorDialog.tsx:53-55`.

- [ ] **Step 2: Verify no new typecheck errors**

Run (in `frontend/`): `npx tsc --noEmit`
Pass criterion: ZERO errors in `src/components/tracking/SourceForm.tsx`. (The ~31 pre-existing errors elsewhere are the known baseline; do NOT fix them.)

- [ ] **Step 3: Lint + Prettier**

Run (in `frontend/`): `npx eslint src/components/tracking/SourceForm.tsx` and `npx prettier --check src/components/tracking/SourceForm.tsx` — both clean (run `npx prettier --write` on the file if needed, then re-check).

- [ ] **Step 4: Commit**

```bash
git add src/components/tracking/SourceForm.tsx
git commit -m "feat: add shared source form component"
```

---

### Task 2: Create `ManageSourcesDialog`

Self-contained dialog: fetches the manga's sources, manages add/edit/delete state, renders `SourceForm` inline and `DeleteConfirmDialog` on delete. Mutations come from the hooks (toasts + auto-refetch of the list are hook-owned).

**Skills:** `tanstack-query-best-practices` (per-manga query key, mutations with `onSuccess` side effects, conditional mount lifecycle), `frontend-design` (dialog composition per admin patterns — Skeleton/Empty/ErrorDisplay), `verification-before-completion`.

**Files:**
- Create: `frontend/src/components/tracking/ManageSourcesDialog.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/tracking/ManageSourcesDialog.tsx` with exactly this content:

```tsx
import { useState } from 'react'
import { Pencil, Plus, Radar, Trash2 } from 'lucide-react'
import {
  useCreateTrackingSource,
  useDeleteTrackingSource,
  useTrackingSources,
  useUpdateTrackingSource,
} from '#/hooks/useTracking'
import type { TrackingSourceResponse } from '#/services/api/trackingApi'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import {
  ErrorAction,
  ErrorDescription,
  ErrorDisplay,
  ErrorTitle,
} from '#/components/ui/error-display'
import { DeleteConfirmDialog } from '#/components/common/DeleteConfirmDialog'
import { SourceForm } from './SourceForm'
import type { SourceFormValues } from './SourceForm'

interface ManageSourcesDialogProps {
  mangaId: number
  mangaTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageSourcesDialog({
  mangaId,
  mangaTitle,
  open,
  onOpenChange,
}: ManageSourcesDialogProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSource, setEditingSource] =
    useState<TrackingSourceResponse | null>(null)
  const [deleteSource, setDeleteSource] =
    useState<TrackingSourceResponse | null>(null)

  const { data, isLoading, isError, refetch } = useTrackingSources(mangaId)
  const createMutation = useCreateTrackingSource()
  const updateMutation = useUpdateTrackingSource()
  const deleteMutation = useDeleteTrackingSource()

  const handleAdd = (values: SourceFormValues) => {
    createMutation.mutate(
      { mangaId, name: values.name.trim(), url: values.url.trim() },
      { onSuccess: () => setShowAddForm(false) },
    )
  }

  const handleUpdate = (values: SourceFormValues) => {
    if (!editingSource) return
    updateMutation.mutate(
      {
        id: editingSource.id,
        data: { name: values.name.trim(), url: values.url.trim() },
      },
      { onSuccess: () => setEditingSource(null) },
    )
  }

  const showForm = showAddForm || editingSource !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Sources — {mangaTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingSource(null)
              setShowAddForm(true)
            }}
          >
            <Plus className="size-4" />
            Add Source
          </Button>
        </div>

        {showForm && (
          <SourceForm
            key={editingSource?.id ?? 'add'}
            initialValues={{
              name: editingSource?.name ?? '',
              url: editingSource?.url ?? '',
            }}
            submitLabel={editingSource ? 'Save' : 'Add'}
            isPending={
              editingSource
                ? updateMutation.isPending
                : createMutation.isPending
            }
            onSubmit={editingSource ? handleUpdate : handleAdd}
            onCancel={() => {
              setShowAddForm(false)
              setEditingSource(null)
            }}
          />
        )}

        {isLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <ErrorDisplay>
            <ErrorTitle>Failed to Load Tracking Sources</ErrorTitle>
            <ErrorDescription>Make sure the backend is running.</ErrorDescription>
            <ErrorAction>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </ErrorAction>
          </ErrorDisplay>
        )}

        {data && data.data.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Radar />
              </EmptyMedia>
              <EmptyTitle>No Sources Configured</EmptyTitle>
              <EmptyDescription>
                No sources configured for this manga.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {data && data.data.length > 0 && (
          <div className="flex flex-col">
            {data.data.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">{source.name}</p>
                  <p className="truncate font-mono text-sm text-muted-foreground">
                    {source.url}
                  </p>
                  {source.extractorPath && (
                    <p className="text-sm text-muted-foreground">
                      Path: {source.extractorPath}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {source.latestChapterNumber ?? 'Not checked yet'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${source.name}`}
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingSource(source)
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${source.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteSource(source)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <DeleteConfirmDialog
          open={!!deleteSource}
          onOpenChange={(open) => {
            if (!open) setDeleteSource(null)
          }}
          title="Delete Source"
          entityName={deleteSource?.name ?? ''}
          isPending={deleteMutation.isPending}
          onConfirm={() => {
            if (!deleteSource) return
            deleteMutation.mutate(deleteSource.id, {
              onSuccess: () => setDeleteSource(null),
            })
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
```

Notes:
- The `key={editingSource?.id ?? 'add'}` remounts `SourceForm` whenever the mode or the edited source changes, so `useState(initialValues)` always starts from the right values.
- Add/edit form closes itself only on success (`onSuccess` in `mutate` options); toasts and list refetch are hook-owned (`invalidateQueries(trackingKeys.all)`).
- The dialog's source list is the same `GET /tracking-sources?mangaId=` endpoint the tracking table uses, so create/update/delete also refresh the table on the page behind the dialog.
- Only the title is required for the header; `DialogDescription` omitted deliberately (matching the spec).

- [ ] **Step 2: Verify no new typecheck errors**

Run (in `frontend/`): `npx tsc --noEmit`
Pass criterion: ZERO errors in `src/components/tracking/ManageSourcesDialog.tsx`. Do NOT fix pre-existing baseline errors.

- [ ] **Step 3: Lint + Prettier**

Run (in `frontend/`): `npx eslint src/components/tracking/ManageSourcesDialog.tsx` and `npx prettier --check src/components/tracking/ManageSourcesDialog.tsx` — both clean (write if needed, re-check).

- [ ] **Step 4: Commit**

```bash
git add src/components/tracking/ManageSourcesDialog.tsx
git commit -m "feat: add manage sources dialog"
```

---

### Task 3: Wire `TrackingPage` to open the dialog

Replace the `onManage={() => undefined}` stub with `manageSource` state and a conditionally-mounted `ManageSourcesDialog`.

**Skills:** `tanstack-query-best-practices` (conditional mount so the per-manga query only runs while the dialog is open), `tanstack-router-best-practices` (no route changes — dialog is page-local), `frontend-design` (modal wiring), `verification-before-completion`.

**Files:**
- Modify: `frontend/src/components/tracking/TrackingPage.tsx` (3 edits: import, state, onManage + dialog render)

- [ ] **Step 1: Add the import**

After the `TrackingSourcesTable` import (line 9), add:

```tsx
import { ManageSourcesDialog } from './ManageSourcesDialog'
```

- [ ] **Step 2: Add state + change onManage**

Replace the state block (lines 12-13) and the `onManage` stub (line 58). After `const [pageSize, setPageSize] = useState(20)`, add:

```tsx
  const [manageSource, setManageSource] = useState<{
    mangaId: number
    mangaTitle: string
  } | null>(null)
```

Replace:

```tsx
        onManage={() => undefined}
```

with:

```tsx
        onManage={(source) =>
          setManageSource({
            mangaId: source.mangaId,
            mangaTitle: source.manga?.title ?? `Manga #${source.mangaId}`,
          })
        }
```

- [ ] **Step 3: Render the dialog**

After the closing `</div>` of `TrackingSourcesTable` (i.e., inside the page's root `<div>`, right before its closing tag), add:

```tsx
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
```

The resulting file should be:

```tsx
import { useEffect, useState } from 'react'
import {
  useTrackingConfig,
  useTrackingSources,
  useUpdateTrackingConfig,
} from '#/hooks/useTracking'
import type { UpdateTrackingConfigPayload } from '#/services/api/trackingApi'
import { TrackingConfigPanel } from './TrackingConfigPanel'
import { TrackingSourcesTable } from './TrackingSourcesTable'
import { ManageSourcesDialog } from './ManageSourcesDialog'

export function TrackingPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [manageSource, setManageSource] = useState<{
    mangaId: number
    mangaTitle: string
  } | null>(null)

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
      <div>
        <h1 className="text-2xl font-bold">Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage tracking sources and schedule automatic chapter checks.
        </p>
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
    </div>
  )
}
```

Notes:
- Conditional mount means the dialog (and its `useTrackingSources(mangaId)` query) only exists while `manageSource` is set; closing resets it to `null`, so reopening refetches fresh data.
- The `source.manga?.title` fallback matches the table's own title rendering (`TrackingSourcesTable.tsx`).

- [ ] **Step 4: Verify no new typecheck errors**

Run (in `frontend/`): `npx tsc --noEmit`
Pass criterion: ZERO errors in `src/components/tracking/TrackingPage.tsx`. Do NOT fix pre-existing baseline errors.

- [ ] **Step 5: Lint + Prettier**

Run (in `frontend/`): `npx eslint src/components/tracking/TrackingPage.tsx` and `npx prettier --check src/components/tracking/TrackingPage.tsx` — both clean (write if needed, re-check).

- [ ] **Step 6: Commit**

```bash
git add src/components/tracking/TrackingPage.tsx
git commit -m "feat: open manage sources dialog from tracking page"
```

---

### Task 4: Full verification

**Skills:** `verification-before-completion` (run every command, confirm output before claiming done), `frontend-design` (final visual/UX sanity check).

**Files:** none (verification only).

- [ ] **Step 1: Typecheck (scope)**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: the known pre-existing baseline errors ONLY (~31) — zero in `src/components/tracking/**`. List any error files to confirm none are in scope.

- [ ] **Step 2: Lint + Prettier (scope)**

Run (in `frontend/`): `npx eslint src/components/tracking/*.tsx` — clean.
Run (in `frontend/`): `npx prettier --check src/components/tracking/*.tsx src/routes/admin/tracking.tsx` — clean. If any in-scope file is unformatted, run `npx prettier --write` on exactly those and re-check.

- [ ] **Step 3: Build**

Run (in `frontend/`): `npm run build`
Expected: PASS (Vite build completes). Record the result.

- [ ] **Step 4: Regression tests**

Run (in `frontend/`): `npm run test`
Expected: PASS — 58 tests in 5 files (incl. `useTracking.spec.tsx`). Record pass/fail counts.

- [ ] **Step 5: Manual sanity check (if backend available)**

With the backend running (`docker compose up --build` or `cd backend && npm run start:dev`):
1. Open `/admin/tracking`; click "Manage" on a row → dialog opens with title "Manage Sources — {manga title}".
2. Empty list → "No sources configured for this manga" + Radar icon.
3. Click "Add Source" → inline form; Save disabled until name + URL filled; Save → success toast "Source "name" created", form closes, row appears.
4. Click pencil on a row → form pre-populated; change name, Save → toast "Source "name" updated", row updates.
5. Click trash → DeleteConfirmDialog "Delete Source"; confirm → toast "Source deleted", row disappears.
6. Cancel buttons on form and delete dialog close without changes.
7. Close and reopen the dialog — list refetches fresh.

- [ ] **Step 6: Commit any fix-ups**

If Steps 1-4 required fixes:

```bash
git add -A src
git commit -m "fix: resolve manage sources dialog verification issues"
```

---

## Out of Scope (do not implement)

- Backend extractorPath support (forms must NOT send it — backend `forbidNonWhitelisted` would reject with 400)
- Check Now / check endpoints (MR118_2, MR119_2)
- Pagination inside the dialog (per-manga lists are small; hook default limit 20)
- Component tests (user decision; hooks covered by `useTracking.spec.tsx`)
- Any change to `TrackingSourcesTable.tsx` (already wired)
