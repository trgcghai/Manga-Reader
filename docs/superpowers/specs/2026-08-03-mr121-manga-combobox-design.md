# MR121 — MangaCombobox (type-to-fetch manga selection)

Date: 2026-08-03
Status: Approved

## Summary

Build `MangaCombobox` — a reusable, type-to-fetch manga selector for the tracking feature. It mirrors `TranslatorCombobox` (`frontend/src/components/translator/TranslatorCombobox.tsx`, used by the translator field in `AddChapterDialog`) exactly: a `Popover` + `Command` combobox whose search text is sent to the backend on every keystroke, with server-side filtering. Consumed by `CreateTrackingSourceDialog` (MR122).

## Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Component shape | Dedicated `MangaCombobox` (not a generalized AsyncCombobox, not inline) | User chose the dedicated-component approach: lowest risk, follows the existing TranslatorCombobox pattern exactly, reusable by MR122 and future screens |
| Fetch | `useMangaList({ page: 1, limit: 50, search: search || undefined })` | `getAllMangas` already supports `search`; mirrors `useTranslatorList(1, 50, search || undefined)` |
| Debounce | None — search text passed straight to the hook | Same as TranslatorCombobox; React Query dedupes keyed by search value |
| Filtering | `Command shouldFilter={false}` | Server-side filtering, not client-side |
| Tests | No component tests | Same preference as MR119_1/MR120; AGENTS.md fixture-test note overridden by user decision |

## Architecture

```
CreateTrackingSourceDialog (MR122, future consumer)
  → MangaCombobox (this task)
       state: open (popover), search (input), selectedTitle (display)
       useMangaList({ page: 1, limit: 50, search: search || undefined })
       → data.data: MangaResponse[] (manga.title displayed)
```

Standalone addition: no existing file is modified.

## MangaCombobox

File: `frontend/src/components/tracking/MangaCombobox.tsx`

Props (identical shape to `TranslatorComboboxProps`):

```ts
interface MangaComboboxProps {
  value: number
  onChange: (id: number) => void
  invalid?: boolean
  id?: string
  placeholder?: string
}
```

- `Popover` + `PopoverTrigger asChild` wrapping a `Button` (`variant="outline"`, `role="combobox"`, `aria-expanded={open}`, `aria-invalid={invalid}`, `w-full justify-between font-normal`, `text-muted-foreground` when nothing selected)
- Trigger content: `selectedTitle || placeholder` (default `"Search manga..."`) + `ChevronsUpDown` (muted)
- `PopoverContent`: `w-[var(--radix-popover-trigger-width)] p-0` containing `Command` with `shouldFilter={false}`
  - `CommandInput` `placeholder="Search manga..."` bound to `search` state
  - `CommandList`
- Fetch: `useMangaList({ page: 1, limit: 50, search: search || undefined })`
- **Loading**: centered `Loader2` (h-5 w-5, animate-spin, text-muted-foreground) in a `role="status"` div
- **Error**: "Failed to load mangas." + ghost sm Retry button (`RotateCcw`) calling `refetch()`
- **Empty**: `CommandEmpty` "No mangas found." when `!isLoading && !isError && data && data.data.length === 0`
- **Data**: `CommandGroup` of `CommandItem` per manga — `value={String(manga.id)}`, `onSelect={() => handleSelect(manga.id, manga.title)}`, `Check` icon (`mr-2 h-4 w-4`, `opacity-100` when `value === manga.id` else `opacity-0`), label `manga.title`
- `handleSelect(id, title)`: `setSelectedTitle(title)`, `onChange(id)`, `setOpen(false)`, `setSearch('')`
- `useEffect`: when `value === 0` → `setSelectedTitle(undefined)` (mirrors TranslatorCombobox)
- Imports: `Command*` from `#/components/ui/command`, `Popover*` from `#/components/ui/popover`, `Button` from `#/components/ui/button`, `cn` from `#/lib/utils`, `Loader2`/`Check`/`ChevronsUpDown`/`RotateCcw` from `lucide-react`, `useMangaList` from `#/hooks/useManga`

## Data Flow

1. User clicks trigger → popover opens, `useMangaList` fires with empty search (page 1, limit 50)
2. User types → `search` state updates → query refetches with the new search string (new query key, no debounce)
3. Loading spinner replaces content; on success, `data.data` renders; on failure, error + Retry
4. Selecting an item → `onChange(manga.id)` (parent owns the value) + title shown on trigger
5. Parent resets `value` to 0 → effect clears displayed title

## Error Handling

- API failure → error state in list (message + Retry → `refetch()`)
- Empty result → `CommandEmpty` message
- No form-level error paths; parent handles `invalid` prop for aria only

## Verification

- `npx tsc --noEmit` from `frontend/` — zero errors in `src/components/tracking/` (pre-existing baseline elsewhere, untouched)
- `npx eslint src/components/tracking/MangaCombobox.tsx` — clean
- `npx prettier --check src/components/tracking/MangaCombobox.tsx` — clean (write if needed)
- `npm run build` — pass
- `npm run test` — 58 existing tests still pass (no new tests per user decision)

## Files

- Create: `frontend/src/components/tracking/MangaCombobox.tsx`
- No existing files changed
