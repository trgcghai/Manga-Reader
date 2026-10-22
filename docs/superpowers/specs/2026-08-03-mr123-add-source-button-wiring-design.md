# MR123 — Wire Add Source button into Tracking page header

Date: 2026-08-03
Status: Approved

## Summary

Add a page-level "Add Source" button to the Tracking page header that opens `CreateTrackingSourceDialog` (MR122) via conditional mount — the same pattern as the existing `manageSource` flow (MR120). The button is always visible, including when the sources table is empty, fixing the dead-end flagged in the MR120 review (previously the only way to create a source was the per-row "Manage" button, so the first source could never be created).

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Button variant | Default solid + `Plus` icon, header-right placement | User chose solid over outline; matches translators.tsx "Add Translator" convention |
| Dialog state | Local `createOpen: boolean` state in TrackingPage | Same shape as existing `manageSource` flow; minimal code |
| Mounting | Conditional `{createOpen && <CreateTrackingSourceDialog open .../>}` | Unmount-on-close resets dialog state (MR122's no-reset design depends on this); query/fetch only exists while open |
| Rejected alternatives | `activeDialog` union state; always-mounted dialog with `open` prop | Union state adds churn (manageSource carries data, can't collapse to a string union cleanly); always-mounted breaks MR122's fresh-state design |

## Architecture

```
TrackingPage
  ├─ existing: manageSource state + ManageSourcesDialog (per-row Manage, MR120) — UNCHANGED
  └─ new: createOpen state
       header row: flex items-center justify-between
         left:  h1 "Tracking" + description (existing)
         right: <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Source
                </Button>
       {createOpen && (
         <CreateTrackingSourceDialog
           open
           onOpenChange={(open) => { if (!open) setCreateOpen(false) }}
         />
       )}
```

## TrackingPage changes

File: `frontend/src/components/tracking/TrackingPage.tsx` (modified, only file changed)

- Add imports:
  - `Button` from `#/components/ui/button`
  - `Plus` from `lucide-react`
  - `CreateTrackingSourceDialog` from `./CreateTrackingSourceDialog`
- Add state after `manageSource`: `const [createOpen, setCreateOpen] = useState(false)`
- Header: wrap existing title block in `<div className="flex items-center justify-between">`; button on the right:
  ```tsx
  <Button onClick={() => setCreateOpen(true)}>
    <Plus className="h-4 w-4" />
    Add Source
  </Button>
  ```
- Mount dialog after the existing `manageSource` block (as shown in Architecture)
- Do NOT change: `TrackingSourcesTable` props, `ManageSourcesDialog` wiring, `TrackingConfigPanel`, pagination state, page/pageSize logic

## Data Flow

1. Click "Add Source" → `createOpen = true` → dialog mounts fresh (`mangaId = 0`, empty form)
2. Create flow (MR122): select manga → fill name/url → Create → success → dialog closes itself via `onOpenChange(false)` → `createOpen = false` → unmount
3. Cancel / X / Escape: same unmount path
4. After creation, the tracking table refetches automatically (hook invalidates `trackingKeys.all`); no extra wiring needed

## Error Handling

- None new: the dialog owns its error handling (hook toasts, MR122). Button always enabled.

## Verification

- `npx tsc --noEmit` from `frontend/` — zero errors in `src/components/tracking/` (pre-existing baseline elsewhere, untouched)
- `npx eslint src/components/tracking/TrackingPage.tsx` — clean
- `npx prettier --check src/components/tracking/TrackingPage.tsx` — clean (write if needed)
- `npm run build` — pass
- `npm run test` — 58 existing tests pass (no new tests per user decision)
- Manual sanity: button visible with empty table → dialog opens → create succeeds → toast + table updates → reopen is fresh

## Files

- Modify: `frontend/src/components/tracking/TrackingPage.tsx` (only file)
