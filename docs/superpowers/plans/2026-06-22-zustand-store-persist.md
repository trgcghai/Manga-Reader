# Zustand Store Persist Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `persist` middleware from `zustand/middleware` to the reader store so state survives page refreshes.

**Architecture:** Add SSR-safe localStorage adapter, import `persist` + `createJSONStorage`, wrap the `create()` call with `persist` config, use `partialize` to whitelist state fields. No changes to the existing `translationSlice`.

**Tech Stack:** Zustand 5.x, TanStack Start (SSR), TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/stores/rootStore.ts` | Modify | Add persist middleware + storage adapter |

---

### Task 1: Add persist middleware to rootStore

**Related skills:** `zustand`

**Files:**
- Modify: `frontend/src/stores/rootStore.ts`

- [ ] **Add imports** from `zustand/middleware`:

```typescript
import { persist, createJSONStorage } from 'zustand/middleware'
```

- [ ] **Add SSR-safe storage adapter** before the `initialState` declaration:

```typescript
const createStorage = () => ({
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {}
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {}
  },
})
```

- [ ] **Replace the store creation** from:

```typescript
export const useReaderStore = create<TranslationSlice>()(translationSlice)
```

To:

```typescript
export const useReaderStore = create<TranslationSlice>()(
  persist(translationSlice, {
    name: 'manga-reader-store',
    version: 1,
    storage: createJSONStorage(() => createStorage()),
    partialize: (state) => ({
      currentTranslation: state.currentTranslation,
      currentChapter: state.currentChapter,
      currentPage: state.currentPage,
      totalPages: state.totalPages,
      readingMode: state.readingMode,
      displayMode: state.displayMode,
      scrollPosition: state.scrollPosition,
    }),
  }),
)
```

- [ ] **Also remove unused imports** if any (the `create` import from zustand is still needed — keep it)

- [ ] **Verify compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No new errors (pre-existing `field.tsx` error is unrelated)

- [ ] **Verify build**

Run: `cd frontend && npm run build`

Expected: 0 errors

---

### Task 2: Commit

- [ ] **Stage and commit**

```bash
git add frontend/src/stores/rootStore.ts
git commit -m "feat: add persist middleware to zustand reader store"
```
