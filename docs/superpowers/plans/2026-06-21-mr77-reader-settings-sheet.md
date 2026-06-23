# MR77: Wire ReaderSettingsSheet with Store — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock `ReaderSettingsSheet` with functional shadcn controls wired to the Zustand reader store.

**Architecture:** Single-file change to `ReaderSettingsSheet.tsx` — add `ToggleGroup` for Display Mode and Reading Mode, read/write `useReaderStore`, replace raw `zinc-*` tokens with semantic CSS variables. Two shadcn UI primitives installed via CLI.

**Tech Stack:** shadcn/ui (new-york style, zinc base), ToggleGroup/ToggleGroupItem, lucide-react Settings icon, Zustand store, Tailwind CSS v4 semantic tokens.

---

### Task 1: Install shadcn toggle + toggle-group components

**Skills:** shadcn

**Files:**
- Create: `frontend/src/components/ui/toggle.tsx`
- Create: `frontend/src/components/ui/toggle-group.tsx`

- [ ] **Step 1: Install toggle and toggle-group via shadcn CLI**

Run: `npx shadcn@latest add toggle toggle-group`

Expected output: Two files created (`toggle.tsx`, `toggle-group.tsx`) in `frontend/src/components/ui/`.

- [ ] **Step 2: Verify files exist and build passes**

Run: `npm run build`

Expected: Build succeeds (0 errors, 0 warnings).

---

### Task 2: Rewrite ReaderSettingsSheet with shadcn controls + store wiring

**Skills:** frontend-design, shadcn

**Files:**
- Modify: `frontend/src/components/reader/ReaderSettingsSheet.tsx`

- [ ] **Step 1: Read the current file**

Read `frontend/src/components/reader/ReaderSettingsSheet.tsx` to confirm current content before editing.

- [ ] **Step 2: Replace the full file content**

Replace the file with the implementation below:

```tsx
import type { ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { Separator } from '#/components/ui/separator'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '#/components/ui/toggle-group'
import { useReaderStore } from '#/stores/rootStore'

interface ReaderSettingsSheetProps {
  children?: ReactNode
}

export function ReaderSettingsSheet({ children }: ReaderSettingsSheetProps) {
  const displayMode = useReaderStore((s) => s.displayMode)
  const readingMode = useReaderStore((s) => s.readingMode)
  const setDisplayMode = useReaderStore((s) => s.setDisplayMode)
  const setReadingMode = useReaderStore((s) => s.setReadingMode)

  return (
    <Sheet>
      {children}
      <SheetContent
        side="right"
        className="w-80 gap-6"
      >
        <SheetHeader>
          <SheetTitle>Reader Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Display Mode
            </h3>
            <ToggleGroup
              type="single"
              value={displayMode}
              onValueChange={(v) => v && setDisplayMode(v as 'single' | 'double')}
            >
              <ToggleGroupItem value="single" className="flex-1">Single</ToggleGroupItem>
              <ToggleGroupItem value="double" className="flex-1">Double</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Reading Mode
            </h3>
            <ToggleGroup
              type="single"
              value={readingMode}
              onValueChange={(v) => v && setReadingMode(v as 'page' | 'scroll')}
            >
              <ToggleGroupItem value="page" className="flex-1">Page</ToggleGroupItem>
              <ToggleGroupItem value="scroll" className="flex-1">Scroll</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Next Page</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">→</kbd>
              </li>
              <li className="flex justify-between">
                <span>Prev Page</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">←</kbd>
              </li>
              <li className="flex justify-between">
                <span>Next / Space</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">Space</kbd>
              </li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ReaderSettingsTrigger() {
  return (
    <SheetTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Settings className="size-5" />
      </Button>
    </SheetTrigger>
  )
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd frontend && npm run build`

Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Verify tests pass**

Run: `cd frontend && npm run test`

Expected: All tests pass (0 failures).

---

### Task 3: Verify build + tests final

**Skills:** verification-before-completion

- [ ] **Step 1: Run full frontend verification**

Run: `cd frontend && npm run build && npm run test`

Expected: Build succeeds (0 errors), all tests pass (0 failures).
