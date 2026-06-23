# MR81: Store & Keyboard Handler for Scroll Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `scrollPosition` tracking to the Zustand reader store and make `useReaderKeyboard` readingMode-aware (suppress Space in scroll mode).

**Architecture:** Two isolated changes — (1) add a scalar field + setter to the existing store slice, (2) add a `readingMode` option to the keyboard hook to conditionally suppress Space. No new files, no cross-cutting concerns.

**Tech Stack:** Zustand, React 19, TypeScript

**Related skills:** `zustand` (Task 1), `vercel-react-best-practices` (Task 2)

---

### Task 1: Add scrollPosition to reader store

**Files:**
- Modify: `frontend/src/stores/rootStore.ts`

**Related skill:** `zustand` — use simple `set` pattern for scalar field

- [ ] **Step 1: Add `scrollPosition` to the interface and initialState**

Insert `scrollPosition` field into `TranslationSlice` interface and `initialState`.

In `frontend/src/stores/rootStore.ts`:

Find the interface block:
```typescript
export interface TranslationSlice {
  currentTranslation: TranslationDetailResponse | null
  currentChapter: { ... } | null
  currentPage: number
  totalPages: number
  readingMode: 'page' | 'scroll'
  displayMode: 'single' | 'double'
```

Add `scrollPosition` after `totalPages`:
```typescript
  scrollPosition: number
```

Find `initialState`:
```typescript
const initialState = {
  currentTranslation: null,
  currentChapter: null,
  currentPage: 0,
  totalPages: 0,
  readingMode: 'page' as const,
  displayMode: 'single' as const,
}
```

Add `scrollPosition` after `totalPages`:
```typescript
  scrollPosition: 0,
```

- [ ] **Step 2: Add `setScrollPosition` action**

In the `TranslationSlice` interface, add the setter after `setDisplayMode`:
```typescript
  setDisplayMode: (mode: 'single' | 'double') => void
  setScrollPosition: (n: number) => void         // NEW
  nextPage: () => void
```

In the `translationSlice` creator, add the implementation after `setDisplayMode`:
```typescript
  setScrollPosition: (n) => set({ scrollPosition: n }),
```

- [ ] **Step 3: Update `reset()` to include `scrollPosition`**

`reset()` already spreads `initialState` which now includes `scrollPosition: 0`. No change needed — it resets automatically.

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

---

### Task 2: Add readingMode to useReaderKeyboard options

**Files:**
- Modify: `frontend/src/hooks/useReaderKeyboard.ts`

**Related skill:** `vercel-react-best-practices` — useEffect dependency management

- [ ] **Step 1: Add `readingMode` to the options interface**

In `frontend/src/hooks/useReaderKeyboard.ts`, update the interface:

```typescript
interface UseReaderKeyboardOptions {
  onNextPage: () => void
  onPrevPage: () => void
  enabled: boolean
  readingMode: 'page' | 'scroll'
}
```

- [ ] **Step 2: Destructure `readingMode` and gate Space**

Update the function signature:
```typescript
export function useReaderKeyboard({
  onNextPage,
  onPrevPage,
  enabled,
  readingMode,
}: UseReaderKeyboardOptions): void {
```

Inside the `switch` statement, gate the `' '` case:

```typescript
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          onPrevPage()
          break
        case 'ArrowRight':
          e.preventDefault()
          onNextPage()
          break
        case ' ':
          if (readingMode === 'page') {
            e.preventDefault()
            onNextPage()
          }
          break
      }
```

- [ ] **Step 3: Add `readingMode` to the dependency array**

```typescript
  }, [onNextPage, onPrevPage, enabled, readingMode])
```

- [ ] **Step 4: Verify build**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

---

### Verification

- [ ] **Manual check:** Open the built route with `cd frontend && npm run dev`, ensure existing page-mode keyboard navigation still works (ArrowLeft, ArrowRight, Space all trigger page turns)
- [ ] No TypeScript errors in editor or build output
