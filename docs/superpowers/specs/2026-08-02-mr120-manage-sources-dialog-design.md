# MR120 — Manage Sources Dialog (CRUD on tracking sources per manga)

Date: 2026-08-02
Status: Approved

## Summary

Build `ManageSourcesDialog` — opened by the "Manage" button on the tracking page (MR119_1) — which lists all tracking sources for a manga and provides create, edit, and delete. Consumes MR118_1 hooks (`useTrackingSources(mangaId)`, `useCreateTrackingSource`, `useUpdateTrackingSource`, `useDeleteTrackingSource`).

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| extractorPath | Omit from Add/Edit forms and payloads; keep optional "Path: {extractorPath}" display | Backend `ValidationPipe` uses `forbidNonWhitelisted: true` and the DTOs/entity have no extractorPath → sending it causes a 400. Frontend-only MR; display is harmless (currently never renders) |
| Form component | One shared `SourceForm` used for both Add and Edit | User chose DRY over the task file's two-file list; fields are identical |
| Tests | No component tests | Same as MR119_1; hooks already covered by `useTracking.spec.tsx` |
| Dialog mounting | Conditional mount from `TrackingPage` (`{manageSource && <ManageSourcesDialog .../>}`) | Query only runs while open; fresh refetch on each open |
| List error state | `<ErrorDisplay>` + Retry (in addition to spec's loading/empty states) | Matches admin page patterns |

## Architecture

```
TrackingSourcesTable (unchanged — already calls onManage(source))
  → TrackingPage: manageSource state { mangaId: number, mangaTitle: string } | null
     title from source.manga?.title ?? `Manga #${source.mangaId}`
  → {manageSource && <ManageSourcesDialog
        mangaId={manageSource.mangaId}
        mangaTitle={manageSource.mangaTitle}
        open={true}
        onOpenChange={(open) => { if (!open) setManageSource(null) }}
     />}
  → ManageSourcesDialog (self-contained, spec prop contract)
       useTrackingSources(mangaId)            → source list
       useCreate/Update/DeleteTrackingSource  → mutations (hooks own toasts + invalidate trackingKeys.all)
       SourceForm (shared)                    → inline add/edit form
       DeleteConfirmDialog (existing)         → delete confirmation
```

## ManageSourcesDialog

Props: `{ mangaId: number, mangaTitle: string, open: boolean, onOpenChange: (open: boolean) => void }`

- Dialog title: "Manage Sources — {mangaTitle}"
- [Add Source] button at top (variant "outline", size "sm"); clicking renders `SourceForm` with empty initial values, submit label "Add"
- Source list (from `useTrackingSources(mangaId)`):
  - **Loading**: 5× `<Skeleton className="h-14 w-full">` rows
  - **Empty**: `<Empty>` + `<EmptyMedia variant="icon">` (Radar icon) + title "No Sources Configured" + description "No sources configured for this manga"
  - **Error**: `<ErrorDisplay>` "Failed to Load Tracking Sources" + Retry (calls `refetch`)
  - **Data**: rows separated by `border-t` dividers
- Each row:
  - Source name (`font-medium`)
  - URL: `truncate`, `font-mono`, `text-muted-foreground`
  - `Path: {extractorPath}` — rendered only when `extractorPath` is set (currently never; kept per spec)
  - Latest chapter: `latestChapterNumber ?? 'Not checked yet'`
  - [Edit] Pencil (ghost/sm), [Delete] Trash2 (ghost/sm, destructive styling)
- Add/Edit: clicking sets `showAddForm` / `editingSource` state → inline `SourceForm`; cancel clears it
- Delete: sets `deleteSource` state → `DeleteConfirmDialog` (title "Delete Source", entityName = source.name, onConfirm → `useDeleteTrackingSource` mutation)
- List refetches after create/update/delete automatically (mutations invalidate `trackingKeys.all`); the tracking table on the page refetches too

## SourceForm (shared component)

- Props: `{ initialValues: { name: string; url: string }, submitLabel: string, isPending: boolean, onSubmit: (values: { name: string; url: string }) => void, onCancel: () => void }`
- Local state `name`, `url` (strings); parent remounts with `key` (e.g. `key={editingSource?.id ?? 'add'}`) to initialize values
- Fields: Name input (required), URL input (required, `type="url"`). No extractorPath field.
- [Save] button: disabled when `!name.trim() || !url.trim() || isPending`; shows `Loader2` spinner + "Saving..." while pending
- [Cancel] button (outline): closes form without saving

## Files

Create:

- `frontend/src/components/tracking/ManageSourcesDialog.tsx`
- `frontend/src/components/tracking/SourceForm.tsx`

Change:

- `frontend/src/components/tracking/TrackingPage.tsx` — replace `onManage={() => undefined}` stub with `manageSource` state + conditional dialog render
- `tasks/MR120.md` — update files to create/change and extractorPath requirement (see below)

Unchanged: `TrackingSourcesTable.tsx` already forwards the full source via `onManage`.

## Task File Adjustments (tasks/MR120.md)

- Files to create: `ManageSourcesDialog.tsx`, `SourceForm.tsx` (replaces `AddSourceForm.tsx` + `EditSourceForm.tsx`)
- Files to change: `TrackingPage.tsx` (replaces stale `MangaTrackingTable.tsx` reference; the table already forwards `onManage`)
- Requirements: remove extractorPath from Add/Edit form fields; keep optional "Path: {extractorPath}" display

## Acceptance Criteria (from MR120.md)

- [ ] Dialog opens when "Manage" is clicked on a manga row
- [ ] Dialog title includes the manga title
- [ ] Loading state shows skeleton rows
- [ ] Empty state shows "No sources configured" message
- [ ] Each source row shows name, URL, and latest chapter number (extractorPath display kept, currently hidden)
- [ ] "Add Source" button opens inline form with name and url fields
- [ ] Adding a source calls create API and shows success toast
- [ ] "Edit" button opens inline form pre-populated with current values
- [ ] Editing a source calls update API and shows success toast
- [ ] "Delete" button opens DeleteConfirmDialog
- [ ] Deleting a source calls delete API and shows success toast
- [ ] Source list refetches after create/update/delete
- [ ] Save button disabled when required fields empty or mutation pending
- [ ] Cancel button closes the inline form without saving

## Out of Scope

- Backend extractorPath support (future work; field omitted from forms until then)
- Check Now / check endpoints (MR118_2, MR119_2)
- Component tests
