# MR122 — Create Tracking Source Dialog

Date: 2026-08-03
Status: Approved

## Summary

Build `CreateTrackingSourceDialog` — a page-level, create-only dialog that adds a new tracking source for any manga. It reuses the existing `SourceForm` (name + url) and the new `MangaCombobox` (MR121, type-to-fetch manga selection), and uses the existing `useCreateTrackingSource` hook. Opened from the Tracking page header button (MR123), fixing the MR120 gap where the first source for a manga could never be created (the only entry point was the per-row "Manage" button).

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Dialog scope | Create-only (manga selector + form, no source list) | User explicitly confirmed create-only over a full manage-with-selector dialog; per-row "Manage" remains the management surface |
| Field layout | MangaCombobox + SourceForm stacked in the dialog (dialog owns `mangaId` state) | Reuses SourceForm unchanged in structure; dialog is a thin orchestrator like ManageSourcesDialog; no duplication of form logic |
| SourceForm change | Add optional `canSubmit?: boolean` (default `true`), AND-ed into internal checks | Gates Save on manga selection; backwards compatible — ManageSourcesDialog untouched |
| Pending label | Keep SourceForm's hardcoded "Saving..." — no `pendingLabel` prop | User decision; the generic label is acceptable for the create flow |
| Dialog description | Include `DialogDescription` "Add a new tracking source for a manga." | Matches AddChapterDialog's create-dialog pattern (ManageSourcesDialog omits it, but that's a manage dialog) |
| Close behavior | `onOpenChange(false)` only on success | Hook owns toasts + invalidation; error keeps dialog open with values retained |
| extractorPath | Omit from payload | Backend `forbidNonWhitelisted: true` → 400 (same note as MR120) |
| Tests | No component tests | Same preference as MR119_1/MR120/MR121 |

## Architecture

```
TrackingPage (MR123, next MR)
  → {createOpen && <CreateTrackingSourceDialog open onOpenChange={...} />}   (conditional mount → state resets on each open)
  → CreateTrackingSourceDialog (this MR, self-contained)
       mangaId state (0 = unselected)
       MangaCombobox (MR121)   → search mangas (page 1, limit 50, search)
       SourceForm (existing)   → name + url + Create/Cancel, canSubmit={mangaId !== 0}
       useCreateTrackingSource (existing hook) → toast + invalidate trackingKeys.all
```

## CreateTrackingSourceDialog

File: `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`

Props: `{ open: boolean, onOpenChange: (open: boolean) => void }`

- Dialog title: "Create Tracking Source"; `DialogDescription`: "Add a new tracking source for a manga."
- Manga field: `FieldLabel` "Manga" (required) + `MangaCombobox` (`id="create-source-manga"`, `value={mangaId}`, `onChange={setMangaId}`, placeholder default)
- `SourceForm`:
  - `initialValues={{ name: '', url: '' }}`
  - `submitLabel="Create"`
  - `canSubmit={mangaId !== 0}`
  - `isPending={createMutation.isPending}`
  - `onSubmit={handleCreate}` — `createMutation.mutate({ mangaId, name: values.name.trim(), url: values.url.trim() }, { onSuccess: () => onOpenChange(false) })`
  - `onCancel={() => onOpenChange(false)}`
- Imports: `useState`, `useCreateTrackingSource` from `#/hooks/useTracking`, `MangaCombobox` from `./MangaCombobox`, `SourceForm` (+ `SourceFormValues` type) from `./SourceForm`, `Field/FieldContent/FieldLabel` from `#/components/ui/field`, `Dialog*` from `#/components/ui/dialog`

## SourceForm change

File: `frontend/src/components/tracking/SourceForm.tsx` (modified)

- Add optional prop: `canSubmit?: boolean` (default `true`)
- Effective gate: `const effectiveCanSubmit = canSubmit !== false && name.trim() !== '' && url.trim() !== '' && !isPending`
- Use `effectiveCanSubmit` for both `handleSubmit` guard and Save button `disabled`
- No other behavior changes; `ManageSourcesDialog` call site unchanged

## Data Flow

1. User clicks "Add Source" (MR123 button) → dialog mounts fresh (`mangaId = 0`)
2. Manga field: typing fetches `/mangas?page=1&limit=50&search=...`; selecting sets `mangaId`
3. Save disabled until manga selected + name/url non-empty + not pending
4. Submit → `useCreateTrackingSource` → success: toast + invalidate `trackingKeys.all` (tracking table + ManageSourcesDialog refetch automatically) → dialog closes; error: toast, dialog stays open, values retained
5. Cancel / X / Escape closes without creating

## Error Handling

- MangaCombobox owns its loading/error/empty states (MR121)
- Create failure → error toast from hook; no inline error UI needed
- No submission-validation error path (gate prevents empty submissions)

## Verification

- `npx tsc --noEmit` from `frontend/` — zero errors in `src/components/tracking/` (pre-existing baseline elsewhere, untouched)
- `npx eslint src/components/tracking/CreateTrackingSourceDialog.tsx src/components/tracking/SourceForm.tsx` — clean
- `npx prettier --check` same files — clean (write if needed)
- `npm run build` — pass
- `npm run test` — 58 existing tests pass (no new tests per user decision)
- Manual sanity: open dialog → manga search → select → name/url → Create → toast + close

## Files

- Create: `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`
- Modify: `frontend/src/components/tracking/SourceForm.tsx` (add `canSubmit` prop only)
- (MR123, separate MR: wire the header button + conditional mount in `TrackingPage.tsx`)
