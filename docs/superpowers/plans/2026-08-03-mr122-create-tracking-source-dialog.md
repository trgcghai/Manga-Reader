# Create Tracking Source Dialog (MR122) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a page-level, create-only dialog that adds a tracking source for any manga, reusing `SourceForm` and `MangaCombobox` (MR121).

**Architecture:** A self-contained dialog (`frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`) owning a single `mangaId` state (0 = unselected). It renders a Manga field (`FieldLabel` + `MangaCombobox`) above the existing `SourceForm` (name + url + Create/Cancel). `SourceForm` gains one backwards-compatible optional prop `canSubmit` (default `true`) so Save stays disabled until a manga is selected. Submission calls the existing `useCreateTrackingSource` hook (owns toasts + invalidation); the dialog closes only on success. Wired into the tracking page by MR123 (separate MR) via conditional mount.

**Tech Stack:** React + TypeScript, TanStack Query (`useCreateTrackingSource` in `#/hooks/useTracking`), shadcn/ui primitives (`Dialog*`, `Field*`), `MangaCombobox` (MR121), `SourceForm` (MR120).

**Spec:** `docs/superpowers/specs/2026-08-03-mr122-create-tracking-source-dialog-design.md`
**Task file:** `tasks/MR122.md`

**Baseline note:** the repo has pre-existing `npx tsc --noEmit` errors in unrelated files (~31). The pass criterion is ZERO errors in `src/components/tracking/`. Do NOT fix the baseline. `npm run lint` and `npm run check` fail repo-wide pre-existing; lint/prettier scoped to touched files only.

---

### Task 1: Add `canSubmit` prop to SourceForm

**Files:**
- Modify: `frontend/src/components/tracking/SourceForm.tsx`

**Skills:** shadcn (shadcn/ui primitives `Button`/`Input`/`Field*` used here — verify prop usage against component docs), frontend-design (form button disabled-state UX: the gate must keep Save visibly disabled).

- [ ] **Step 1: Read the current SourceForm**

Read `frontend/src/components/tracking/SourceForm.tsx` — confirm it matches the content below (it should: unchanged since MR120, commit `3627080`).

- [ ] **Step 2: Apply the change**

The complete modified file (`frontend/src/components/tracking/SourceForm.tsx`) must be exactly:

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
  canSubmit?: boolean
}

export function SourceForm({
  initialValues,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
  canSubmit = true,
}: SourceFormProps) {
  const [name, setName] = useState(initialValues.name)
  const [url, setUrl] = useState(initialValues.url)

  const effectiveCanSubmit =
    canSubmit && name.trim() !== '' && url.trim() !== '' && !isPending

  const handleSubmit = () => {
    if (!effectiveCanSubmit) return
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
        <Button onClick={handleSubmit} disabled={!effectiveCanSubmit}>
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

Only differences from the current file: the `canSubmit?: boolean` prop in the interface (line after `onCancel: () => void`), the `canSubmit = true` destructure default, and `effectiveCanSubmit` replacing the old `canSubmit` const (now AND-ed with the prop, used in both `handleSubmit` guard and Button `disabled`).

- [ ] **Step 3: Typecheck — zero new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: NO errors mentioning `src/components/tracking/SourceForm.tsx` or `src/components/tracking/`. Pre-existing errors in unrelated files (~31, incl. `src/hooks/useTracking.spec.tsx`) are the known baseline — do NOT fix them.

- [ ] **Step 4: Lint and format**

Run from `frontend/`:
- `npx eslint src/components/tracking/SourceForm.tsx` → expected exit 0
- `npx prettier --check src/components/tracking/SourceForm.tsx` → expected clean; if it fails, run `npx prettier --write src/components/tracking/SourceForm.tsx` and re-check

- [ ] **Step 5: Commit**

```bash
git add src/components/tracking/SourceForm.tsx
git commit -m "feat: allow external gate on source form submit"
```

Expected: commit succeeds, only that file staged. `git status --short` clean after.

---

### Task 2: Create the CreateTrackingSourceDialog

**Files:**
- Create: `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`

**Skills:** shadcn (shadcn/ui primitives `Dialog*`, `Field*` — verify export names and usage), tanstack-query-best-practices (`useCreateTrackingSource` usage: the hook owns toasts + `invalidateQueries(trackingKeys.all)`; the dialog only closes the form on success — no duplicate side effects), frontend-design (dialog composition and required-field UX mirroring `AddChapterDialog`).

- [ ] **Step 1: Read the dependencies**

Read `frontend/src/components/tracking/MangaCombobox.tsx` (props: `{ value: number, onChange: (id: number) => void, invalid?: boolean, id?: string, placeholder?: string }`), `frontend/src/components/tracking/SourceForm.tsx` (now with `canSubmit`), and `frontend/src/components/chapter/AddChapterDialog.tsx` (dialog + Field composition reference). Confirm `#/components/ui/dialog` exports `Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle` and `#/components/ui/field` exports `Field, FieldContent, FieldLabel`.

- [ ] **Step 2: Create the component with exactly this content**

Create `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`:

```tsx
import { useState } from 'react'
import { useCreateTrackingSource } from '#/hooks/useTracking'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Field, FieldContent, FieldLabel } from '#/components/ui/field'
import { MangaCombobox } from './MangaCombobox'
import { SourceForm } from './SourceForm'
import type { SourceFormValues } from './SourceForm'

interface CreateTrackingSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTrackingSourceDialog({
  open,
  onOpenChange,
}: CreateTrackingSourceDialogProps) {
  const [mangaId, setMangaId] = useState(0)
  const createMutation = useCreateTrackingSource()

  const handleCreate = (values: SourceFormValues) => {
    createMutation.mutate(
      { mangaId, name: values.name.trim(), url: values.url.trim() },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Tracking Source</DialogTitle>
          <DialogDescription>
            Add a new tracking source for a manga.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="create-source-manga" required>
            Manga
          </FieldLabel>
          <FieldContent>
            <MangaCombobox
              id="create-source-manga"
              value={mangaId}
              onChange={setMangaId}
            />
          </FieldContent>
        </Field>

        <SourceForm
          initialValues={{ name: '', url: '' }}
          submitLabel="Create"
          canSubmit={mangaId !== 0}
          isPending={createMutation.isPending}
          onSubmit={handleCreate}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
```

Notes:
- `mangaId` resets to 0 on every mount; MR123 mounts this dialog conditionally so it's always fresh on open — do NOT add a reset effect.
- No `invalid` passed to MangaCombobox: the `canSubmit` gate prevents submission without a manga, so there's no invalid state to reflect.
- Do NOT include a source list, edit, delete, or any extractorPath payload field (backend `forbidNonWhitelisted` → 400).

- [ ] **Step 3: Typecheck — zero new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: NO errors mentioning `src/components/tracking/CreateTrackingSourceDialog.tsx` or `src/components/tracking/`. Pre-existing errors in unrelated files are the known baseline — do NOT fix them.

- [ ] **Step 4: Lint and format**

Run from `frontend/`:
- `npx eslint src/components/tracking/CreateTrackingSourceDialog.tsx` → expected exit 0
- `npx prettier --check src/components/tracking/CreateTrackingSourceDialog.tsx` → expected clean; if it fails, run `npx prettier --write` and re-check

- [ ] **Step 5: Commit**

```bash
git add src/components/tracking/CreateTrackingSourceDialog.tsx
git commit -m "feat: add create tracking source dialog with manga select"
```

Expected: commit succeeds, only that file staged. `git status --short` clean after.

---

### Task 3: Whole-MR verification

**Files:** none (verification only)

**Skills:** verification-before-completion (run every verification command and record real output before claiming completion — evidence before assertions), requesting-code-review (final review pass before wrapping the MR), tanstack-query-best-practices (sanity-check: create mutation invalidates `trackingKeys.all`, the dialog adds no duplicate invalidation or toast).

- [ ] **Step 1: Typecheck scope**

Run from `frontend/`: `npx tsc --noEmit`

Expected: zero errors in `src/components/tracking/`. Record the pre-existing baseline count elsewhere (should be unchanged from before this MR).

- [ ] **Step 2: Lint + prettier**

Run from `frontend/`:
- `npx eslint src/components/tracking/CreateTrackingSourceDialog.tsx src/components/tracking/SourceForm.tsx` → exit 0
- `npx prettier --check src/components/tracking/CreateTrackingSourceDialog.tsx src/components/tracking/SourceForm.tsx` → clean

- [ ] **Step 3: Build**

Run from `frontend/`: `npm run build`

Expected: exit 0, `✓ built in ...`.

- [ ] **Step 4: Existing test suite**

Run from `frontend/`: `npm run test`

Expected: 5 files / 58 tests passed, exit 0. (No new tests — user decision for this MR.)

- [ ] **Step 5: Manual sanity check (dev server)**

Optional but recommended: with `npm run dev` + backend running, temporarily render in `frontend/src/routes/admin/tracking.tsx`:

```tsx
<CreateTrackingSourceDialog
  open
  onOpenChange={() => {}}
/>
```

Then verify in the browser: dialog opens with title + description → Manga combobox search fetches and selects → Save is disabled until a manga is chosen → filling name/url enables Save → Create shows "Saving..." → on success dialog closes + toast appears. Revert the temporary render afterwards (do not commit it).

- [ ] **Step 6: Commit if any changes were made**

If Step 5 produced no leftover changes, nothing to commit. Verify `git status --short` is clean (or only gitignored files). If anything changed, commit it separately with a descriptive message — never amend the previous commits.

---

## Final Gate

- MR122 spec checklist: all acceptance criteria in `tasks/MR122.md` satisfied — dialog opens without an existing source row, title "Create Tracking Source", manga combobox type-to-fetch, Save gated on manga + name/url, payload `{ mangaId, name, url }` (no extractorPath), close-on-success, error keeps dialog open, SourceForm backwards compatible (ManageSourcesDialog unchanged).
- Whole-MR code review (subagent-driven flow) before marking the MR done.
