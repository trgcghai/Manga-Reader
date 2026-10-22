# MR119_1 — Tracking Page: Layout, Config Panel, Tracking Sources Table

Date: 2026-08-02
Status: Approved

## Summary

Build the tracking page at `/admin/tracking` (frontend only). The page shows a collapsible config panel for cronjob settings and a flat table of tracking sources (one row per source — no manga-level grouping). Consumes the MR118_1 hooks (`useTrackingSources`, `useTrackingConfig`, `useUpdateTrackingConfig`). The route file exists as a placeholder; `ManageSourcesDialog` (MR120) does not exist yet and is not part of this task.

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Table rows | One row per tracking source (flat list) | User explicitly removed the manga-level grouping requirement; `GET /tracking-sources` is already paginated server-side |
| Data fetching | Server-side pagination via `useTrackingSources(page, limit)`; no client-side grouping | Task file adjusted (`MR119_1.md`) |
| Architecture | `TrackingPage` owns hooks + pagination state; children are presentational | Matches `authors.tsx` admin convention |
| Last Checked column | Display `updatedAt` via `formatDateTime` (proxy; no `lastCheckedAt` field exists) | User-approved; `-` when null |
| Tests | No component tests — matches existing admin pages (hooks already tested in `useTracking.spec.tsx`) | User-approved |
| Success toast on save | Provided by `useUpdateTrackingConfig` (`toast.success('Tracking config updated')`) — no extra toast code | Hooks own toasts per repo convention |

## Component Architecture

```
routes/admin/tracking.tsx
  └─ TrackingPage                     ← owns hooks + pagination state
       ├─ useTrackingConfig()              → config (isLoading, isError)
       ├─ useTrackingSources(page, limit)  → sources (isLoading, isError)
       ├─ page/pageSize state
       ├─ TrackingConfigPanel              ← presentational
       │    props: config?, isLoading, isSaving, onSave(payload)
       └─ TrackingSourcesTable             ← presentational
            props: data, isLoading, isError, onRetry,
                   page, totalPages, totalItems, pageSize,
                   onPageChange, onPageSizeChange, onManage(source)
```

## Data Flow

- `TrackingPage` renders page header ("Tracking" title + description), then `TrackingConfigPanel`, then `TrackingSourcesTable`.
- `page`/`pageSize` are `useState`; `page` resets to 1 when `pageSize` changes (existing admin pattern from `authors.tsx`).
- `onRetry` = `refetch` from the sources query.
- `onManage(source)` is plumbed from the table to `TrackingPage`; the handler is a stub this MR (dialog wiring arrives with MR120). The Manage button renders now with `variant="ghost"`, `size="sm"`.

## TrackingConfigPanel

- `Collapsible` wrapper, default open; header "Tracking Config" with chevron trigger.
- Form fields using `Field` / `FieldLabel`, `Select`, `Input`:
  - **Frequency**: shadcn `Select` with items `daily | weekly | monthly | yearly` (lowercase values, capitalized labels)
  - **Interval**: `<Input type="number" min={1}>`; validated >= 1 before save
  - **Run At**: `<Input type="time">` (HH:mm)
- While config `isLoading`: skeleton placeholders; form disabled until loaded.
- On load: initialize form state from `config` (`frequency`, `interval`, `runAt`).
- [Save] button: disabled while `isSaving` or config not loaded; submits `{ frequency, interval, runAt }` (full payload — all fields optional in `UpdateTrackingConfigPayload` but we always send all three).

## TrackingSourcesTable

- Semantic `<Table className="border">` (same as `authors.tsx`; no TanStack Table).
- Columns:
  - **Manga Title** — link to `/admin/mangas/:id` via `navigate` (id from `row.mangaId`)
  - **Source Name** — `row.name`
  - **Latest Found** — `row.latestChapterNumber` or `-`
  - **Last Checked** — `formatDateTime(row.updatedAt)` or `-`
  - **Actions** — Manage button (ghost/sm)
- States:
  - **Loading**: 5× `<Skeleton className="h-14 w-full" />` rows
  - **Empty**: `<Empty>` with `<EmptyHeader>`, `<EmptyMedia variant="icon">` (lucide icon, e.g. `Radar`), `<EmptyTitle>` "No Tracking Sources", `<EmptyDescription>` "No tracking sources yet. Add tracking sources to get started."
  - **Error**: `<ErrorDisplay>` with `<ErrorTitle>` "Failed to Load Tracking Sources", `<ErrorDescription>` "Make sure the backend is running.", retry button calling `onRetry`
  - **Data**: rows + `Pagination` component (existing UI component) wired to server-side `page`/`limit`

## Route Change

- `frontend/src/routes/admin/tracking.tsx`: replace placeholder `<div>tracking page</div>` with `<TrackingPage />`. No route-tree regeneration needed (route and sidebar link already exist).

## Files

Create:

- `frontend/src/components/tracking/TrackingPage.tsx`
- `frontend/src/components/tracking/TrackingConfigPanel.tsx`
- `frontend/src/components/tracking/TrackingSourcesTable.tsx`

Change:

- `frontend/src/routes/admin/tracking.tsx` — import and render `TrackingPage`

## Acceptance Criteria (from MR119_1.md)

- [ ] Page accessible at `/admin/tracking`
- [ ] Config panel shows current frequency, interval, runAt values
- [ ] Saving config calls `PATCH /tracking-sources/config` and shows success toast (hook-owned)
- [ ] Table shows all tracking sources (server-side paginated)
- [ ] Each row: linked manga title, source name, latest found chapter, last checked, Manage action
- [ ] Manage button opens ManageSourcesDialog (wired in MR120; handler stubbed here)
- [ ] Pagination appears when results exceed page size
- [ ] Loading shows skeleton rows; empty shows "No tracking sources yet" message; error shows ErrorDisplay with retry
- [ ] Existing admin pages and sidebar unaffected

## Out of Scope

- `ManageSourcesDialog` (MR120)
- "Check Now" action (MR119_2)
- Check endpoints / `useCheckMangaSources` etc. (MR118_2)
- Backend changes
- Component tests
