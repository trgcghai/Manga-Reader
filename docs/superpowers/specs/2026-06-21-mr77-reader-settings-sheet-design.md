# MR77: Wire ReaderSettingsSheet with Store — Design Spec

## Goal

Replace the mock/placeholder `ReaderSettingsSheet` with functional controls wired to the Zustand reader store. Display Mode toggling affects the reader immediately. Reading Mode toggling persists the setting (scroll behavior is future work).

## Design

Single-file change to `frontend/src/components/reader/ReaderSettingsSheet.tsx`.

### 1. Add shadcn ToggleGroup components

Install `toggle` and `toggle-group` via the shadcn CLI. These are not yet present in `src/components/ui/`.

### 2. Redesign SheetContent

Replace raw `zinc-*` classes with semantic tokens:

| Current | Replacement |
|---|---|
| `bg-zinc-950` | `bg-background` |
| `border-zinc-800` | `border-border` |
| `text-zinc-100` | `text-foreground` |
| `text-zinc-400` | `text-muted-foreground` |
| `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-300` | `text-foreground` |
| `bg-zinc-900` / `bg-zinc-950` (control bg) | use ToggleGroup variants |
| `bg-zinc-800` (Separator) | remove className, default works |
| `space-y-*` | `flex flex-col gap-*` |

### 3. Control sections

**Display Mode** — `ToggleGroup` type="single" with values `'single'` and `'double'`. Two `ToggleGroupItem` children: "Single" and "Double". Connected to store via `value={displayMode}` and `onValueChange={(v) => v && setDisplayMode(v as 'single' | 'double')}`.

**Reading Mode** — `ToggleGroup` type="single" with values `'page'` and `'scroll'`. Two `ToggleGroupItem` children: "Page" and "Scroll". Connected to store via `value={readingMode}` and `onValueChange={(v) => v && setReadingMode(v as 'page' | 'scroll')}`. Scroll mode has no reader behavior yet — only store persistence.

**Navigation** — kept as-is (static reference), restyled with `text-muted-foreground`. No state.

### 4. Store wiring

Import `useReaderStore` and destructure `{ displayMode, readingMode, setDisplayMode, setReadingMode }`. These already exist as dead code in `rootStore.ts`.

### 5. Trigger button

Retain `data-icon` pattern on the `Settings` icon (already done). Keep `absolute top-4 right-4` positioning in the route.

## File Changes

| File | Change |
|---|---|
| `frontend/src/components/reader/ReaderSettingsSheet.tsx` | Full rewrite — ToggleGroup controls + store wiring + semantic tokens |
| `frontend/src/components/ui/toggle.tsx` | New (from shadcn CLI) |
| `frontend/src/components/ui/toggle-group.tsx` | New (from shadcn CLI) |

## Testing

- `cd frontend && npm run build` — typecheck passes
- `cd frontend && npm run test` — existing suite passes
- Manual: open sheet, toggle Display Mode, verify page viewer layout changes immediately
- Manual: toggle Reading Mode, verify no error (no behavior change yet)

## Edge Cases

- **ToggleGroup null value**: `onValueChange` receives `undefined` when user clicks the already-selected item; guard with `v &&` before calling setter.
- **Reading mode scroll unused**: store value is set correctly but no component reads it yet. No runtime errors.
- **Sheet open on narrow viewport**: `className="w-80"` provides consistent width.
