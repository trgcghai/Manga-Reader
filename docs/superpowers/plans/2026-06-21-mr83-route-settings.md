# MR83: Route Integration & Settings Sheet Updates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire `readingMode` in the reader route to conditionally render PageViewer vs ScrollViewer, pass `readingMode` to the keyboard hook, and show a side-by-side navigation reference in the settings sheet.

**Architecture:** Two independent file changes — route reads `readingMode` from store and switches between PageViewer/ScrollViewer; settings sheet renders a two-column grid showing shortcuts for both modes simultaneously.

**Tech Stack:** React 19, TypeScript, Zustand, TanStack Router, shadcn/ui (Command, ButtonGroup)

**Related skills:** `tanstack-router-best-practices` (Task 1), `frontend-design` (Task 2)

---

### Task 1: Route integration — conditional PageViewer/ScrollViewer

**Files:**
- Modify: `frontend/src/routes/_reader/reader.$translationId.tsx`

**Related skill:** `tanstack-router-best-practices` — route component patterns, store integration

- [ ] **Step 1: Add ScrollViewer import**

After the `PageViewer` import (line 6), add:
```typescript
import { ScrollViewer } from '#/components/reader/ScrollViewer'
```

- [ ] **Step 2: Read `readingMode` from store**

On line 33, add `readingMode` to the destructured store values:
```typescript
const { currentPage, displayMode, totalPages, readingMode, setCurrentPage } =
  useReaderStore()
```

- [ ] **Step 3: Pass `readingMode` to keyboard hook**

On line 90-94, update the `useReaderKeyboard` call:
```typescript
  useReaderKeyboard({
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    enabled: pages.length > 0,
    readingMode,
  })
```

- [ ] **Step 4: Conditional rendering**

Replace the PageViewer block (lines 145-151):
```tsx
        {readingMode === 'scroll' ? (
          <ScrollViewer
            pages={pages}
            displayMode={displayMode}
            onPrevChapter={handlePrevPage}
            onNextChapter={handleNextPage}
          />
        ) : (
          <PageViewer
            pages={pages}
            displayMode={displayMode}
            currentPage={currentPage}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        )}
```

The final return block should look like:
```tsx
  return (
    <ReaderSettingsSheet title={data?.chapter.manga.title}>
      <div className="relative h-screen">
        {readingMode === 'scroll' ? (
          <ScrollViewer
            pages={pages}
            displayMode={displayMode}
            onPrevChapter={handlePrevPage}
            onNextChapter={handleNextPage}
          />
        ) : (
          <PageViewer
            pages={pages}
            displayMode={displayMode}
            currentPage={currentPage}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        )}
        <ReaderSettingsTrigger />
      </div>
    </ReaderSettingsSheet>
  )
```

- [ ] **Step 5: Verify build**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

---

### Task 2: Settings sheet — two-column navigation reference

**Files:**
- Modify: `frontend/src/components/reader/ReaderSettingsSheet.tsx`

**Related skill:** `frontend-design` — two-column grid layout, typographic hierarchy for subheadings

- [ ] **Step 1: Add ArrowUp and ArrowDown to lucide imports**

Line 9, update the lucide import:
```typescript
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Settings } from 'lucide-react'
```

- [ ] **Step 2: Replace the static Navigation section**

Find the Navigation section (lines 100-123):
```tsx
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
            <Command className="rounded-lg border-border">
              <CommandList className="max-h-none overflow-visible">
                <CommandGroup>
                  <CommandItem>
                    <span>Next Page</span>
                    <CommandShortcut className="flex items-center gap-1">
                      <ArrowRight className="size-4" />
                      <span>/ Space</span>
                    </CommandShortcut>
                  </CommandItem>
                  <CommandItem>
                    <span>Prev Page</span>
                    <CommandShortcut>
                      <ArrowLeft className="size-4" />
                    </CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
```

Replace with:
```tsx
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Page Mode
                </h4>
                <Command className="rounded-lg border-border">
                  <CommandList className="max-h-none overflow-visible">
                    <CommandGroup>
                      <CommandItem>
                        <span>Next Page</span>
                        <CommandShortcut className="flex items-center gap-1">
                          <ArrowRight className="size-4" />
                          <span>/ Space</span>
                        </CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <span>Prev Page</span>
                        <CommandShortcut>
                          <ArrowLeft className="size-4" />
                        </CommandShortcut>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
              <div>
                <h4 className="text-xs font-medium text-muted-foreground mb-2">
                  Scroll Mode
                </h4>
                <Command className="rounded-lg border-border">
                  <CommandList className="max-h-none overflow-visible">
                    <CommandGroup>
                      <CommandItem>
                        <span>Scroll Up</span>
                        <CommandShortcut className="flex items-center gap-1">
                          <ArrowUp className="size-4" />
                          <span>/ PgUp</span>
                        </CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <span>Scroll Down</span>
                        <CommandShortcut className="flex items-center gap-1">
                          <ArrowDown className="size-4" />
                          <span>/ PgDn / Space</span>
                        </CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <span>Prev Chapter</span>
                        <CommandShortcut>
                          <ArrowLeft className="size-4" />
                        </CommandShortcut>
                      </CommandItem>
                      <CommandItem>
                        <span>Next Chapter</span>
                        <CommandShortcut>
                          <ArrowRight className="size-4" />
                        </CommandShortcut>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>
          </div>
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

---

### Verification

- [ ] `npm run build` passes with 0 errors
- [ ] Page mode renders PageViewer, keyboard navigation unchanged
- [ ] Scroll mode renders ScrollViewer, keyboard uses scroll keys internally
- [ ] Settings sheet shows both Page Mode and Scroll Mode columns in Navigation
- [ ] Switching reading modes in settings sheet still works (no regressions)
