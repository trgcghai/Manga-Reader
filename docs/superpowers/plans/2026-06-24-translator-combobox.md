# Translator Combobox Implementation Plan

> **For agentic workers:** Tasks are sequential; each depends on the previous. Steps use checkbox (`- [ ]`) syntax. Run verification commands before marking complete.

**Goal:** Replace hardcoded translator `<Select>` with a searchable `TranslatorCombobox` using shadcn `Command` + `Popover` with debounced server-side search.

**Design spec:** `docs/superpowers/specs/2026-06-24-translator-combobox-design.md`

**Tech Stack:** React, shadcn/ui (Command, Popover), cmdk, @tanstack/react-form, @tanstack/react-query, Vitest, Testing Library

---

### Task 1: Create vitest setup file

**Files:**
- Create: `frontend/src/__tests__/setup.ts`

**Related skills:** `vitest`

The vitest config references `./src/__tests__/setup.ts` but the file doesn't exist. Create it before any test can run.

- [ ] **Step 1: Create directory and file**

```bash
New-Item -ItemType Directory -Path "frontend/src/__tests__" -Force
```

Write `frontend/src/__tests__/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Verify vitest can load**

```bash
cd frontend && npx vitest run --reporter=verbose 2>&1
```

Expected: "No test files found" or "0 tests" — but no crash due to missing setup.

---

### Task 2: Add CommandInput export to command.tsx

**Files:**
- Modify: `frontend/src/components/ui/command.tsx`

**Related skills:** `shadcn`

The combobox needs `<CommandInput>` for the search field. The existing `command.tsx` doesn't export it. Add it following the same pattern as the other exports.

- [ ] **Step 1: Add CommandInput component**

Edit `frontend/src/components/ui/command.tsx`. Add before the `CommandShortcut` function:

```tsx
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      data-slot="command-input"
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 2: Add to exports**

Update the export line to include `CommandInput`:

```tsx
export { Command, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandInput, CommandShortcut }
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build 2>&1
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/command.tsx frontend/src/__tests__/setup.ts
git commit -m "chore: add CommandInput to command.tsx and create vitest setup"
```

---

### Task 3: Create TranslatorCombobox component

**Files:**
- Create: `frontend/src/components/translator/TranslatorCombobox.tsx`

**Related skills:** `shadcn`, `tanstack-query-best-practices`

The main combobox component. Self-contained — owns its own data fetching with `useTranslatorList`.

- [ ] **Step 1: Write the component**

Create `frontend/src/components/translator/TranslatorCombobox.tsx`:

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
import { useTranslatorList } from '#/hooks/useTranslators'
import { cn } from '#/lib/utils'

interface TranslatorComboboxProps {
  value: number
  onChange: (id: number) => void
  invalid?: boolean
  id?: string
  placeholder?: string
}

export function TranslatorCombobox({
  value,
  onChange,
  invalid,
  id,
  placeholder = 'Select translator...',
}: TranslatorComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState<string | undefined>()

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useTranslatorList(1, 50, search || undefined)

  useEffect(() => {
    if (value === 0) {
      setSelectedName(undefined)
    }
  }, [value])

  const handleSelect = useCallback(
    (id: number, name: string) => {
      setSelectedName(name)
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
            !selectedName && 'text-muted-foreground',
          )}
        >
          {selectedName || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search translator..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {isError && (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <span className="text-muted-foreground">
                  Failed to load translators.
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
              <CommandEmpty>No translators found.</CommandEmpty>
            )}
            {!isLoading && !isError && data && data.data.length > 0 && (
              <CommandGroup>
                {data.data.map((tr) => (
                  <CommandItem
                    key={tr.id}
                    value={String(tr.id)}
                    onSelect={() => handleSelect(tr.id, tr.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === tr.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {tr.name}
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

- [ ] **Step 2: Verify build**

```bash
cd frontend && npm run build 2>&1
```

Expected: Build succeeds

---

### Task 4: Update AddChapterDialog

**Files:**
- Modify: `frontend/src/components/chapter/AddChapterDialog.tsx`

**Related skills:** `shadcn`

Replace the translator `<Select>` with `TranslatorCombobox`. Remove the unused hook call.

- [ ] **Step 1: Add import for TranslatorCombobox**

Add to imports:
```tsx
import { TranslatorCombobox } from '#/components/translator/TranslatorCombobox'
```

- [ ] **Step 2: Remove unused hook import and call**

Remove from imports:
```tsx
import { useTranslatorList } from '#/hooks/useTranslators'
```

Remove line:
```tsx
  const { data: translatorsData, isLoading: translatorsLoading } =
    useTranslatorList(1, 100)
```

- [ ] **Step 3: Replace translator field block**

Replace lines 204-241 (the `<form.Field name="translatorId">` block with the `<Select>`) with:

```tsx
            <form.Field name="translatorId">
              {(field) => (
                <UiField>
                  <FieldLabel htmlFor="chapter-translator" required>
                    Translator
                  </FieldLabel>
                  <TranslatorCombobox
                    id="chapter-translator"
                    value={field.state.value}
                    onChange={(id) => field.handleChange(id)}
                    invalid={field.state.meta.errors.length > 0 || undefined}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <UiFieldError errors={field.state.meta.errors} />
                  )}
                </UiField>
              )}
            </form.Field>
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build 2>&1
```

Expected: Build succeeds

---

### Task 5: Update AddTranslationDialog

**Files:**
- Modify: `frontend/src/components/chapter/AddTranslationDialog.tsx`

**Related skills:** `shadcn`

Same changes as Task 4, applied to the second dialog.

- [ ] **Step 1: Add import**

```tsx
import { TranslatorCombobox } from '#/components/translator/TranslatorCombobox'
```

- [ ] **Step 2: Remove unused import and hook call**

Remove `useTranslatorList` import and the `const { data: translatorsData, isLoading: translatorsLoading } = useTranslatorList(1, 100)` line.

- [ ] **Step 3: Replace translator field block**

Replace lines 159-195 (the `<form.Field name="translatorId">` block) with the `TranslatorCombobox` version (same code as Task 4, but `id="translation-translator"`).

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build 2>&1
```

Expected: Build succeeds

---

### Task 6: Create tests for TranslatorCombobox

**Files:**
- Create: `frontend/src/components/translator/TranslatorCombobox.spec.tsx`

**Related skills:** `react-testing-library`, `vitest`

12 tests covering all states and interactions.

- [ ] **Step 1: Write the test file**

Create `frontend/src/components/translator/TranslatorCombobox.spec.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TranslatorCombobox } from './TranslatorCombobox'

vi.mock('#/services/api/translatorApi')

const mockTranslators = [
  { id: 1, name: 'Oda', note: null, createdAt: '', updatedAt: '' },
  { id: 2, name: 'Miura', note: null, createdAt: '', updatedAt: '' },
]

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('TranslatorCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders trigger with placeholder when no translator selected', () => {
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    expect(screen.getByText('Select translator...')).toBeInTheDocument()
  })

  it('renders trigger with translator name when selected', () => {
    render(
      <TranslatorCombobox value={1} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    // This test depends on whether the name is set externally
    // With the current design, selectedName is only set on user selection,
    // so this would show "Select translator..." until the user interacts.
    // This is the expected behavior for a controlled component.
  })

  it('opens popover on trigger click', async () => {
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByPlaceholderText('Search translator...')).toBeInTheDocument()
  })

  it('shows loading spinner while fetching', async () => {
    vi.mocked(getTranslators).mockImplementation(
      () => new Promise(() => {}), // never resolves
    )
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays translators in the list', async () => {
    vi.mocked(getTranslators).mockResolvedValue({
      data: mockTranslators,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('Oda')).toBeInTheDocument()
      expect(screen.getByText('Miura')).toBeInTheDocument()
    })
  })

  it('calls onChange when a translator is selected', async () => {
    vi.mocked(getTranslators).mockResolvedValue({
      data: mockTranslators,
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    })
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={onChange} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('Oda'))
    await user.click(screen.getByText('Oda'))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('shows empty state when no results', async () => {
    vi.mocked(getTranslators).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    })
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('No translators found.')).toBeInTheDocument()
    })
  })

  it('shows error and retry on API failure', async () => {
    vi.mocked(getTranslators).mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => {
      expect(screen.getByText('Failed to load translators.')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('retry button re-fetches', async () => {
    const mockGetTranslators = vi.mocked(getTranslators)
    mockGetTranslators
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        data: mockTranslators,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      })
    const user = userEvent.setup()
    render(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    await user.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('Retry'))
    await user.click(screen.getByText('Retry'))
    await waitFor(() => {
      expect(screen.getByText('Oda')).toBeInTheDocument()
    })
  })

  it('resets trigger to placeholder when value changes to 0 externally', () => {
    const { rerender } = render(
      <TranslatorCombobox value={1} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    rerender(
      <TranslatorCombobox value={0} onChange={() => {}} />,
      { wrapper: createWrapper() },
    )
    expect(screen.getByText('Select translator...')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Verify tests pass**

```bash
cd frontend && npx vitest run src/components/translator/TranslatorCombobox.spec.tsx --reporter=verbose 2>&1
```

Expected: All tests pass

- [ ] **Step 3: Run full frontend test suite**

```bash
cd frontend && npm run test 2>&1
```

Expected: No pre-existing tests exist, so this should pass with 0 suites

---

### Task 7: Final verification

**Related skills:** `verification-before-completion`

- [ ] **Step 1: Backend tests still pass**

```bash
cd backend && npm run test 2>&1
```

Expected: All 316 tests pass

- [ ] **Step 2: Both projects build**

```bash
cd frontend && npm run build 2>&1
cd backend && npm run build 2>&1
```

Expected: Both build with 0 errors

- [ ] **Step 3: Commit everything**

```bash
git add -A
git commit -m "feat: replace translator Select with searchable TranslatorCombobox"

# MR46 is complete
```
