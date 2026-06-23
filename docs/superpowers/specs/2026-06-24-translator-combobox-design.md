# Translator Combobox Design

> MR46: Replace hardcoded translator `<Select>` with a searchable combobox.

## Problem

Both `AddChapterDialog.tsx` and `AddTranslationDialog.tsx` call `useTranslatorList(1, 100)` to populate a plain `<Select>`. This breaks once there are more than 100 translators and the select is not searchable, forcing users to scroll through an unsorted list.

## Approach

**Self-contained `TranslatorCombobox` component** using shadcn `Command` + `Popover`. The component owns its own data fetching with debounced server-side search. Minimal API surface: `value`, `onChange`, `invalid`, `id`, `placeholder`.

## Architecture

### Component location
`frontend/src/components/translator/TranslatorCombobox.tsx` (new file)

### Props interface
```typescript
interface TranslatorComboboxProps {
  value: number
  onChange: (id: number) => void
  invalid?: boolean
  id?: string
  placeholder?: string   // default "Select translator..."
}
```

### Internal state machine

| State | When | UI |
|-------|------|-----|
| Closed | Popover closed | Trigger shows placeholder or selected name |
| Open — loading | Popover open, API fetching | Spinner in CommandList |
| Open — results | Data loaded | List of CommandItems |
| Open — empty | No results match | "No translators found." |
| Open — error | API failed | Error text + "Retry" button |

### Data flow
1. User types in `<CommandInput>` → local `searchText` state (immediate)
2. 300ms debounce → `debouncedSearch` → `useTranslatorList(1, 50, debouncedSearch)`
3. Query results render as `<CommandItem>` list
4. Selection: set local `selectedName` → `onChange(id)` → close popover
5. External value reset (e.g. form reset to 0): `useEffect` clears `selectedName`
6. Retry: calls `refetch()` from TanStack Query

### Key details
- `<Command shouldFilter={false}>` — server already filters, cmdk must not re-filter
- Popover width matches trigger width via `w-[var(--radix-popover-trigger-width)]`
- Popover content has `p-0` so Command controls its own padding
- Empty search text loads first 50 translators (returns results without `?search=`)

## State Handling

### Loading
- `<Loader2 className="animate-spin" />` shown inside CommandList while `isLoading` is true
- Existing `command.tsx` doesn't export `CommandLoading` — use inline spinner instead

### Empty
- `<CommandEmpty>No translators found.</CommandEmpty>` when `data.data.length === 0`

### Error + Retry
- Error text: "Failed to load translators." shown inline
- Retry button calls `refetch()` on the TanStack Query result
- If retry succeeds, transitions to results or empty; if fails, stays in error state

### Popover install
Installed via `npx shadcn add popover` — creates `frontend/src/components/ui/popover.tsx` with `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription` exports.

## Form Integration

Both dialogs use `@tanstack/react-form`. Integration is a straight swap:

**Before (per dialog):**
```tsx
const { data: translatorsData, isLoading: translatorsLoading } = useTranslatorList(1, 100)
// ...translator <Select> block with translatorsData.data.map(...)
```

**After:**
```tsx
<TranslatorCombobox
  id="chapter-translator"
  value={field.state.value}
  onChange={(id) => field.handleChange(id)}
  invalid={field.state.meta.errors.length > 0 || undefined}
/>
```

Removed from each dialog:
- `useTranslatorList` import
- `const { data: translatorsData, isLoading: translatorsLoading } = useTranslatorList(1, 100)`

Kept unchanged:
- Zod schemas (`translatorId: z.number().refine(n => n > 0)`)
- Language `<Select>` (out of scope)
- Form submit logic
- `Select`/`SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` imports (still used by language field)

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/ui/popover.tsx` | **New** — installed via shadcn CLI |
| `frontend/src/components/translator/TranslatorCombobox.tsx` | **New** — the combobox component |
| `frontend/src/components/translator/TranslatorCombobox.spec.tsx` | **New** — unit tests |
| `frontend/src/components/chapter/AddChapterDialog.tsx` | Remove hook, replace field |
| `frontend/src/components/chapter/AddTranslationDialog.tsx` | Remove hook, replace field |

## Testing Plan

12 unit tests in `TranslatorCombobox.spec.tsx`:

1. Renders trigger with placeholder text
2. Renders trigger with selected translator name
3. Opens popover on trigger click
4. Shows loading spinner while API fetches
5. Displays translator results in CommandList
6. Calls debounced search on input
7. Calls onChange and closes popover on item click
8. Shows "No translators found" on empty results
9. Shows error text + Retry button on API failure
10. Retry button re-fetches the query
11. External value change to 0 resets trigger to placeholder
12. Keyboard navigation works (arrow keys + enter)
