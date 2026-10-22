# MR124 — Fix Add Source form overflowing the Manage Sources dialog

Date: 2026-08-03
Status: Approved for planning

## Background

Bug report: clicking "Add Source" in `ManageSourcesDialog` renders the inline `SourceForm` wider than the dialog. The Name/URL inputs and the Cancel/Add buttons overflow past the dialog's right edge.

## Root cause

`DialogContent` (`frontend/src/components/ui/dialog.tsx:61-64`) is a CSS grid:

```
fixed ... grid w-full max-w-[calc(100%-2rem)] ... gap-4 rounded-lg border bg-background p-6 ... sm:max-w-lg
```

Every direct child of a CSS grid is a grid item with default `min-width: auto`. Grid items cannot shrink below their min-content width unless `min-width: 0` is set. `SourceForm`'s root (`<div className="flex flex-col gap-4 rounded-md border p-4">`) is such a grid item, and its inner action row (`<div className="flex justify-end gap-2">` with nowrap shadcn buttons) contributes min-content width wider than the content track, so the form overflows the dialog's right edge.

The existing source-list rows in `ManageSourcesDialog` already use the correct containment pattern (`min-w-0` on their text container); the inline form does not.

## Scope

- In scope: `SourceForm.tsx` (shared by `ManageSourcesDialog` edit/add flow and `CreateTrackingSourceDialog`), plus a containment check on `CreateTrackingSourceDialog`'s manga `Field`.
- Out of scope: shared `ui/dialog.tsx` hardening (user decision — form components only), any backend changes, layout changes to the source-list rows.

## Design

### 1. SourceForm root container — allow shrinking

`frontend/src/components/tracking/SourceForm.tsx:41`:

```
<div className="flex flex-col gap-4 rounded-md border p-4">
```

becomes:

```
<div className="flex w-full max-w-full min-w-0 flex-col gap-4 rounded-md border p-4">
```

- `min-w-0`: lets the grid item shrink below its min-content width (the core fix)
- `w-full` + `max-w-full`: explicit sizing so the form fills (but never exceeds) the content track

### 2. Action row — wrap instead of overflow

`frontend/src/components/tracking/SourceForm.tsx:71`:

```
<div className="flex justify-end gap-2">
```

becomes:

```
<div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
```

- `min-w-0`: the row itself can shrink
- `flex-wrap`: at narrow widths the Cancel/Add buttons wrap onto a second line instead of overflowing past the dialog edge (buttons keep shadcn `whitespace-nowrap`)

### 3. CreateTrackingSourceDialog — verify containment

`CreateTrackingSourceDialog` (MR122) renders a manga `Field` (with `MangaCombobox`) plus `SourceForm` as direct `DialogContent` children. The Name/URL fields inherit the SourceForm fix automatically. The manga `Field` must be visually checked at narrow widths; if it overflows, add `min-w-0` to that `Field`'s wrapper (`<Field>` className). No other changes expected.

### 4. No change: ManageSourcesDialog

`SourceForm` is rendered directly inside `DialogContent`; the root fix in (1) covers both the edit and add flows.

## Verification

- Manual, dev server (`npm run dev` in `frontend/`):
  - `admin/tracking` → Manage → Add Source, at ~375px, ~640px, and wide viewport: form contained, inputs span available width, Cancel/Add fully visible, no horizontal clipping
  - Same flows via row Edit (same SourceForm instance)
  - Page-level Add Source → `CreateTrackingSourceDialog`: no overflow
  - No horizontal page scrollbar while dialog is open
- `npx tsc --noEmit` from `frontend/`: zero errors in `src/components/tracking/` (pre-existing baseline in unrelated files expected, not to be fixed)
- `npx eslint` and `npx prettier --check` clean on touched files

## Acceptance criteria

- Add Source inline form fully contained within the dialog at narrow and wide viewports
- Name/URL inputs span the available content width without overflowing
- Cancel/Add buttons fully inside the dialog, no horizontal clipping; wrap gracefully at ~375px
- Edit flow (same SourceForm) contained as well
- `CreateTrackingSourceDialog` (MR122) shows no overflow regression
- No horizontal page overflow/scrollbar when a dialog is open
- No new typecheck errors in `src/components/tracking/`; lint and prettier clean on touched files

## Files to change

- `frontend/src/components/tracking/SourceForm.tsx` (root + action row classes)
- `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx` (only if manga Field overflows at narrow widths)

## References

- Dialog content grid: `frontend/src/components/ui/dialog.tsx:61-64`
- Containment pattern in rows: `frontend/src/components/tracking/ManageSourcesDialog.tsx` (`min-w-0` text containers)
- Input already shrinkable: `frontend/src/components/ui/input.tsx` (`w-full min-w-0`)
- Task: `tasks/MR124.md`
