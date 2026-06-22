# MR89: Zustand Store Persist Middleware

## Overview

Add `zustand/middleware`'s `persist` to serialize the full Zustand reader store state to `localStorage` and rehydrate on load, enabling cross-session state survival across page refreshes.

## SSR-Safe Storage Adapter

A wrapper around `localStorage` with try/catch to handle SSR environments (TanStack Start) where `localStorage` is unavailable, or if any storage API throws. Falls back to in-memory (returns `null` for reads, no-ops for writes).

```typescript
const createStorage = () => ({
  getItem: (name: string): string | null => {
    try { return localStorage.getItem(name) }
    catch { return null }
  },
  setItem: (name: string, value: string): void => {
    try { localStorage.setItem(name, value) }
    catch {}
  },
  removeItem: (name: string): void => {
    try { localStorage.removeItem(name) }
    catch {}
  },
})
```

## Store Wiring

- Import `persist` and `createJSONStorage` from `zustand/middleware`
- Wrap the `create<TranslationSlice>()(translationSlice)` call with `persist(translationSlice, { ... })`
- The `translationSlice` itself is unchanged

### Configuration

| Option | Value |
|--------|-------|
| `name` | `'manga-reader-store'` |
| `version` | `1` |
| `storage` | `createJSONStorage(() => createStorage())` |
| `partialize` | Whitelist all 7 state fields (exclude actions) |

### Partialize filter

```typescript
partialize: (state) => ({
  currentTranslation: state.currentTranslation,
  currentChapter: state.currentChapter,
  currentPage: state.currentPage,
  totalPages: state.totalPages,
  readingMode: state.readingMode,
  displayMode: state.displayMode,
  scrollPosition: state.scrollPosition,
})
```

## Files Changed

| File | Action |
|------|--------|
| `frontend/src/stores/rootStore.ts` | Add `persist` + `createJSONStorage` imports, storage adapter, wrap store creation |

## Rehydration Behavior

- Server-side: storage adapter returns null → defaults used
- Client-side: `persist` rehydrates synchronously from localStorage
- Default rehydration timing is acceptable (no `skipHydration`)
