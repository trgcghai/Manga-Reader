# MR119_1 Tracking Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/tracking` page: a collapsible config panel for cronjob settings (frequency/interval/runAt) and a paginated tracking sources table with loading, empty, error, and data states.

**Architecture:** `TrackingPage` (in `frontend/src/components/tracking/TrackingPage.tsx`) owns all data fetching (`useTrackingConfig`, `useTrackingSources(page, limit)`, `useUpdateTrackingConfig`) and pagination state. Two presentational children: `TrackingConfigPanel` (config form) and `TrackingSourcesTable` (table + states). The route file `frontend/src/routes/admin/tracking.tsx` just renders `TrackingPage`. No component tests (user decision — existing admin pages have none; hooks already tested in `useTracking.spec.tsx`); verification is via `tsc --noEmit`, `npm run lint`, `npm run check`, `npm run build`.

**Tech Stack:** React 19, TanStack Start Router, TanStack Query v5, shadcn/ui (Table, Select, Input, Button, Skeleton, Empty, ErrorDisplay, Pagination, Collapsible, Field), lucide-react, date-fns.

**Design doc:** `docs/superpowers/specs/2026-08-02-mr119-1-tracking-page-design.md`
**Task files:** `tasks/MR119_1.md` (adjusted: flat source rows, no manga grouping)

---

## Prerequisites (verify once, before Task 1)

- [ ] `frontend/src/hooks/useTracking.ts` exists and exports `useTrackingSources(mangaId?, page?, limit?)`, `useTrackingConfig()`, `useUpdateTrackingConfig()` (MR118_1, merged).
- [ ] `frontend/src/services/api/trackingApi.ts` exports `TrackingSourceResponse`, `PaginatedTrackingSourceResponse`, `TrackingFrequency`, `TrackingConfigResponse`, `UpdateTrackingConfigPayload`.
- [ ] `frontend/src/routes/admin/tracking.tsx` exists with placeholder content `<div>tracking page</div>`.
- [ ] Run `npx tsc --noEmit` in `frontend/` — must pass before starting.

---

### Task 1: Extend `TrackingSourceResponse` with nested manga title

The backend list endpoint (`GET /tracking-sources`) returns raw entities via `qb.leftJoinAndSelect('source.manga', 'manga')` (see `backend/src/modules/tracking/tracking.repository.ts:34`), so every source includes a nested `manga` object with `id` and `title` — but the frontend type does not declare it. The Manga Title column needs it.

**Skills:** none required (single-type change); verify with `verification-before-completion`.

**Files:**
- Modify: `frontend/src/services/api/trackingApi.ts:3-12` (the `TrackingSourceResponse` interface)

- [ ] **Step 1: Add the nested manga field**

Edit `frontend/src/services/api/trackingApi.ts` so the interface becomes:

```ts
export interface TrackingSourceResponse {
  id: number
  mangaId: number
  url: string
  name: string
  extractorPath?: string
  latestChapterNumber: string | null
  createdAt: string
  updatedAt: string
  manga?: {
    id: number
    title: string
  }
}
```

(`manga` is optional — create/update endpoints map to DTOs that omit it.)

- [ ] **Step 2: Typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS (no output, exit code 0).

- [ ] **Step 3: Commit**

```bash
git add src/services/api/trackingApi.ts
git commit -m "feat: expose nested manga title on tracking source response type"
```

---

### Task 2: Create `TrackingConfigPanel`

Collapsible config form. Presentational — receives `config`, `isLoading`, `isSaving`, `onSave` from `TrackingPage`. Initializes form state when config loads; toasts on save are owned by `useUpdateTrackingConfig` (in the hook, already covered by `useTracking.spec.tsx`).

**Skills:** `frontend-design` (follow existing admin design system — Collapsible/Field/Select/Input), `tanstack-query-best-practices` (mutation ownership pattern: hook owns toasts, panel calls `onSave`), `verification-before-completion` (verification steps).

**Files:**
- Create: `frontend/src/components/tracking/TrackingConfigPanel.tsx` (new directory)

- [ ] **Step 1: Create the component**

Create `frontend/src/components/tracking/TrackingConfigPanel.tsx` with exactly this content:

```tsx
import { useEffect, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import type {
  TrackingConfigResponse,
  TrackingFrequency,
  UpdateTrackingConfigPayload,
} from '#/services/api/trackingApi'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { Field, FieldContent, FieldLabel } from '#/components/ui/field'

const FREQUENCY_OPTIONS: Array<{ value: TrackingFrequency; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

interface TrackingConfigPanelProps {
  config?: TrackingConfigResponse
  isLoading: boolean
  isSaving: boolean
  onSave: (payload: UpdateTrackingConfigPayload) => void
}

export function TrackingConfigPanel({
  config,
  isLoading,
  isSaving,
  onSave,
}: TrackingConfigPanelProps) {
  const [frequency, setFrequency] = useState<TrackingFrequency>('daily')
  const [interval, setInterval] = useState('1')
  const [runAt, setRunAt] = useState('00:00')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (config && !initialized) {
      setFrequency(config.frequency)
      setInterval(String(config.interval))
      setRunAt(config.runAt)
      setInitialized(true)
    }
  }, [config, initialized])

  const handleSave = () => {
    const intervalValue = Number(interval)
    if (!Number.isInteger(intervalValue) || intervalValue < 1) return
    onSave({ frequency, interval: intervalValue, runAt })
  }

  return (
    <Collapsible defaultOpen className="mt-6 overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold">Tracking Config</h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Toggle tracking config">
            <ChevronDown className="size-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="flex flex-wrap items-end gap-6 border-t p-4">
          <Field className="w-40">
            <FieldLabel>Frequency</FieldLabel>
            <FieldContent>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={frequency}
                  onValueChange={(value) =>
                    setFrequency(value as TrackingFrequency)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldContent>
          </Field>

          <Field className="w-28">
            <FieldLabel>Interval</FieldLabel>
            <FieldContent>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input
                  type="number"
                  min={1}
                  value={interval}
                  onChange={(event) => setInterval(event.target.value)}
                />
              )}
            </FieldContent>
          </Field>

          <Field className="w-36">
            <FieldLabel>Run At</FieldLabel>
            <FieldContent>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Input
                  type="time"
                  value={runAt}
                  onChange={(event) => setRunAt(event.target.value)}
                />
              )}
            </FieldContent>
          </Field>

          <Button
            onClick={handleSave}
            disabled={isLoading || isSaving || !config}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
```

Note: form state uses strings for `interval`/`runAt` (native input values); `handleSave` converts and validates (`Number.isInteger` + `>= 1`) before calling `onSave`.

- [ ] **Step 2: Typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/tracking/TrackingConfigPanel.tsx
git commit -m "feat: add tracking config panel component"
```

---

### Task 3: Create `TrackingSourcesTable`

Presentational table with all four states (loading skeletons, error + retry, empty, data + pagination). One row per tracking source. Manga title links to `/admin/mangas/$id` using `row.manga?.title` (added in Task 1).

**Skills:** `frontend-design` (Empty/ErrorDisplay/Skeleton composition per admin patterns), `tanstack-query-best-practices` (presentational component consumes query states via props — no hooks inside), `tanstack-router-best-practices` (typed `<Link to="/admin/mangas/$id" params>`), `verification-before-completion`.

**Files:**
- Create: `frontend/src/components/tracking/TrackingSourcesTable.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/tracking/TrackingSourcesTable.tsx` with exactly this content:

```tsx
import { Link } from '@tanstack/react-router'
import { Radar } from 'lucide-react'
import type {
  PaginatedTrackingSourceResponse,
  TrackingSourceResponse,
} from '#/services/api/trackingApi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
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
import { Pagination } from '#/components/ui/pagination'
import { formatDateTime } from '#/lib/dateTimeFormatter'

interface TrackingSourcesTableProps {
  data?: PaginatedTrackingSourceResponse
  isLoading: boolean
  isError: boolean
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRetry: () => void
  onManage: (source: TrackingSourceResponse) => void
}

export function TrackingSourcesTable({
  data,
  isLoading,
  isError,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onManage,
}: TrackingSourcesTableProps) {
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="mt-6">
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
            <Button variant="outline" onClick={onRetry}>
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
            <EmptyTitle>No Tracking Sources</EmptyTitle>
            <EmptyDescription>
              No tracking sources yet. Add tracking sources to get started.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {data && data.data.length > 0 && (
        <>
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Manga Title
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Source Name
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Latest Found
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Last Checked
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <Link
                      to="/admin/mangas/$id"
                      params={{ id: String(source.mangaId) }}
                      className="font-medium hover:underline"
                    >
                      {source.manga?.title ?? `Manga #${source.mangaId}`}
                    </Link>
                  </TableCell>
                  <TableCell>{source.name}</TableCell>
                  <TableCell>{source.latestChapterNumber ?? '-'}</TableCell>
                  <TableCell>{formatDateTime(source.updatedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onManage(source)}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={data.total}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  )
}
```

Notes:
- `formatDateTime` already returns `'-'` for null/undefined, so `updatedAt` needs no extra guard.
- `totalPages` falls back to 1 so `Pagination` renders safely while loading.
- The `Manage` button only forwards the source via `onManage` — the dialog arrives in MR120; `TrackingPage` passes a no-op for now.

- [ ] **Step 2: Typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/tracking/TrackingSourcesTable.tsx
git commit -m "feat: add tracking sources table component"
```

---

### Task 4: Create `TrackingPage`

Orchestrator: owns `useTrackingConfig`, `useTrackingSources(page, limit)`, `useUpdateTrackingConfig`, and `page`/`pageSize` state. Renders header + `TrackingConfigPanel` + `TrackingSourcesTable`.

**Skills:** `tanstack-query-best-practices` (server-state ownership, page/limit query keys, refetch on retry), `tanstack-router-best-practices` (page renders inside `/admin` layout via Outlet — no route changes needed here), `verification-before-completion`.

**Files:**
- Create: `frontend/src/components/tracking/TrackingPage.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/tracking/TrackingPage.tsx` with exactly this content:

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

export function TrackingPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

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
        onManage={() => undefined}
      />
    </div>
  )
}
```

Notes:
- `useTrackingSources(undefined, page, pageSize)` — first positional arg is `mangaId`; pass `undefined` to list all sources.
- `onManage={() => undefined}` is the MR120 stub (no-op) — empty arrow bodies can trip `no-empty-function` lint rules; `() => undefined` avoids that.
- Page reset on `pageSize` change mirrors `authors.tsx:61-63`.

- [ ] **Step 2: Typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/tracking/TrackingPage.tsx
git commit -m "feat: add tracking page orchestrator component"
```

---

### Task 5: Render `TrackingPage` from the admin route

**Skills:** `tanstack-router-best-practices` (file-based route component wiring; route tree already generated — do NOT hand-edit `routeTree.gen.ts`), `verification-before-completion`.

**Files:**
- Modify: `frontend/src/routes/admin/tracking.tsx` (full replace)

- [ ] **Step 1: Replace the placeholder**

Replace the entire contents of `frontend/src/routes/admin/tracking.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { TrackingPage } from '#/components/tracking/TrackingPage'

export const Route = createFileRoute('/admin/tracking')({
  component: AdminTrackingPage,
})

function AdminTrackingPage() {
  return <TrackingPage />
}
```

- [ ] **Step 2: Typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/admin/tracking.tsx
git commit -m "feat: render tracking page on admin tracking route"
```

---

### Task 6: Full verification

**Skills:** `verification-before-completion` (run every command, confirm output before claiming done), `frontend-design` (final visual sanity check against admin patterns).

**Files:** none (verification only).

- [ ] **Step 1: Typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS (exit code 0, no output).

- [ ] **Step 2: Lint**

Run (in `frontend/`): `npm run lint`
Expected: PASS (exit code 0, no errors). If lint errors appear, fix them, then re-run.

- [ ] **Step 3: Prettier check**

Run (in `frontend/`): `npm run check`
Expected: PASS. If files are unformatted, run `npx prettier --write src/components/tracking src/routes/admin/tracking.tsx src/services/api/trackingApi.ts` then re-run `npm run check`.

- [ ] **Step 4: Build**

Run (in `frontend/`): `npm run build`
Expected: PASS (Vite build completes; `dist/` produced).

- [ ] **Step 5: Run existing hook tests (regression)**

Run (in `frontend/`): `npm run test`
Expected: PASS — existing `useTracking.spec.tsx` (MR118_1) and other suites still green.

- [ ] **Step 6: Manual sanity check (if backend available)**

With `docker compose up --build` or backend `npm run start:dev` running:
1. Visit `/admin/tracking` — header shows "Tracking".
2. Config panel shows current frequency/interval/runAt (or defaults `daily / 1 / 00:00` from backend upsert).
3. Change interval to `5`, click Save → success toast "Tracking config updated" appears.
4. Table shows source rows (or empty state "No tracking sources yet. Add tracking sources to get started.").
5. Manga title links to `/admin/mangas/:id`.
6. Pagination appears when > pageSize sources exist (page size selector works).
7. Stop the backend, click Retry → ErrorDisplay with "Failed to Load Tracking Sources" + Retry button; restart backend, Retry recovers.

- [ ] **Step 7: Commit any fix-ups**

If Steps 1-4 required fixes:

```bash
git add -A src
git commit -m "chore: fix formatting and lint issues on tracking page"
```

---

## Out of Scope (do not implement)

- `ManageSourcesDialog` — MR120 (`onManage` stays a no-op)
- "Check Now" button — MR119_2
- Check API/hooks — MR118_2
- Backend changes (no new endpoints; list endpoint already returns nested `manga`)
- Component tests (user decision; hooks already covered by `useTracking.spec.tsx`)
- Hand-editing `frontend/src/routeTree.gen.ts`
