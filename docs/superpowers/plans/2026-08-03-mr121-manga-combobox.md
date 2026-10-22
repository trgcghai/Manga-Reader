# MangaCombobox (MR121) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a reusable `MangaCombobox` component that lets users search mangas from the backend by typing (type-to-fetch), mirroring the existing `TranslatorCombobox` pattern.

**Architecture:** A standalone, self-contained component (`frontend/src/components/tracking/MangaCombobox.tsx`) pairing a shadcn `Popover` + `Command` combobox with the existing `useMangaList` hook. Search text is passed straight to the hook (no debounce; React Query dedupes by key) with `page: 1, limit: 50`, and `Command shouldFilter={false}` delegates filtering to the server. The parent owns the selected value via the `value`/`onChange` props. No existing files are modified.

**Tech Stack:** React + TypeScript, TanStack Query (`useMangaList` in `#/hooks/useManga`), shadcn/ui primitives (`Button`, `Command*`, `Popover*`), `lucide-react` icons, `cn` from `#/lib/utils`.

**Spec:** `docs/superpowers/specs/2026-08-03-mr121-manga-combobox-design.md`
**Task file:** `tasks/MR121.md`
**Pattern source:** `frontend/src/components/translator/TranslatorCombobox.tsx`

**Baseline note:** the repo has pre-existing `npx tsc --noEmit` errors in unrelated files (~31). The pass criterion is ZERO errors in `src/components/tracking/`. Do NOT fix the baseline. `npm run lint` and `npm run check` fail repo-wide pre-existing; lint/prettier scoped to the touched file only.

---

### Task 1: Create the MangaCombobox component

**Files:**
- Create: `frontend/src/components/tracking/MangaCombobox.tsx`

**Skills:** shadcn (shadcn/ui primitives used: `Button`, `Command*`, `Popover*` — verify prop usage against component docs), frontend-design (component UI quality, aria attributes on the combobox trigger), vercel-react-best-practices (React perf: `useCallback` on `handleSelect`, stable `onChange` dependency).

- [ ] **Step 1: Read the pattern source and the hook signature**

Read `frontend/src/components/translator/TranslatorCombobox.tsx` and the `useMangaList` hook in `frontend/src/hooks/useManga.ts` (signature: `useMangaList({ page, limit, search?, ... })` returning `PaginatedResponse<MangaResponse>` where `MangaResponse` has `id: number` and `title: string`). Confirm `#/components/ui/command` exports `Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList` and `#/components/ui/popover` exports `Popover, PopoverContent, PopoverTrigger`.

- [ ] **Step 2: Create the component with the complete code**

Create `frontend/src/components/tracking/MangaCombobox.tsx` with exactly this content:

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronsUpDown, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { useMangaList } from '#/hooks/useManga'
import { cn } from '#/lib/utils'

interface MangaComboboxProps {
  value: number
  onChange: (id: number) => void
  invalid?: boolean
  id?: string
  placeholder?: string
}

export function MangaCombobox({
  value,
  onChange,
  invalid,
  id,
  placeholder = 'Search manga...',
}: MangaComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>()

  const { data, isLoading, isError, refetch } = useMangaList({
    page: 1,
    limit: 50,
    search: search || undefined,
  })

  useEffect(() => {
    if (value === 0) {
      setSelectedTitle(undefined)
    }
  }, [value])

  const handleSelect = useCallback(
    (id: number, title: string) => {
      setSelectedTitle(title)
      onChange(id)
      setOpen(false)
      setSearch('')
    },
    [onChange],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            'w-full justify-between font-normal',
            !selectedTitle && 'text-muted-foreground',
          )}
        >
          {selectedTitle || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search manga..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div
                className="flex items-center justify-center py-6"
                role="status"
              >
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {isError && (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <span className="text-muted-foreground">
                  Failed to load mangas.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !isError && data && data.data.length === 0 && (
              <CommandEmpty>No mangas found.</CommandEmpty>
            )}
            {!isLoading && !isError && data && data.data.length > 0 && (
              <CommandGroup>
                {data.data.map((manga) => (
                  <CommandItem
                    key={manga.id}
                    value={String(manga.id)}
                    onSelect={() => handleSelect(manga.id, manga.title)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === manga.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {manga.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 3: Typecheck — zero new errors**

Run from `frontend/`: `npx tsc --noEmit`

Expected: NO errors mentioning `src/components/tracking/MangaCombobox.tsx` or `src/components/tracking/`. Pre-existing errors in unrelated files (~31) are the known baseline — do not fix them.

- [ ] **Step 4: Lint and format the new file**

Run from `frontend/`:
- `npx eslint src/components/tracking/MangaCombobox.tsx` → expected exit 0, no output
- `npx prettier --check src/components/tracking/MangaCombobox.tsx` → expected "All matched files use Prettier code style!"; if it fails, run `npx prettier --write src/components/tracking/MangaCombobox.tsx` and re-run the check

- [ ] **Step 5: Commit**

```bash
git add src/components/tracking/MangaCombobox.tsx
git commit -m "feat: add manga combobox with type-to-fetch search"
```

Expected: commit succeeds, only the one file staged. `git status --short` shows a clean tree after.

---

### Task 2: Whole-MR verification

**Files:** none (verification only)

**Skills:** verification-before-completion (run every verification command and record real output before claiming completion — evidence before assertions), requesting-code-review (final review pass before wrapping the MR), tanstack-query-best-practices (sanity-check query usage: `search` in the query key is correct, `refetch` wired to Retry, no `enabled` gating needed since the hook always runs with defaults).

- [ ] **Step 1: Typecheck scope**

Run from `frontend/`: `npx tsc --noEmit`

Expected: zero errors in `src/components/tracking/`. Count and record the pre-existing baseline elsewhere (should be unchanged from before this MR).

- [ ] **Step 2: Lint + prettier**

Run from `frontend/`:
- `npx eslint src/components/tracking/MangaCombobox.tsx` → exit 0
- `npx prettier --check src/components/tracking/MangaCombobox.tsx` → clean

- [ ] **Step 3: Build**

Run from `frontend/`: `npm run build`

Expected: exit 0, `✓ built in ...`.

- [ ] **Step 4: Existing test suite**

Run from `frontend/`: `npm run test`

Expected: 5 files / 58 tests passed, exit 0. (No new tests — user decision for this MR.)

- [ ] **Step 5: Manual sanity check (dev server)**

Optional but recommended: with `npm run dev` + backend running, temporarily render `<MangaCombobox value={0} onChange={(id) => console.log('selected', id)} />` inside `frontend/src/routes/admin/tracking.tsx`, then verify in the browser: trigger shows placeholder → popover opens → initial list loads → typing filters server-side → selecting calls onChange with the manga id → closing resets. Revert the temporary render afterwards (do not commit it).

- [ ] **Step 6: Commit if any changes were made**

If Step 5 produced no leftover changes, nothing to commit. Verify `git status --short` is clean (or only shows gitignored files). If anything changed, amend nothing — commit the fix separately with a descriptive message.

---

## Final Gate

- MR121 spec checklist: all acceptance criteria in `tasks/MR121.md` satisfied — component exists, props match, states (loading/error/empty/data) present, `useMangaList({ page: 1, limit: 50, search })` used, selection wiring (`onChange` + trigger title + reset on `value === 0`), no existing files modified.
- Whole-MR code review (subagent-driven flow) before marking the MR done.
