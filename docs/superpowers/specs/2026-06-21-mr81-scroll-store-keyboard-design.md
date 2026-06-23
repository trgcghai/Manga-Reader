# MR81: Store & Keyboard Handler for Scroll Mode — Design Spec

## Overview

MR81 adds `scrollPosition` tracking to the Zustand reader store and modifies `useReaderKeyboard` to be `readingMode`-aware. Scroll-specific keyboard handling (ArrowUp/Down, PageUp/Down) is owned by the ScrollViewer component (MR82), not the global hook.

---

## Store Changes (`rootStore.ts`)

### New fields and actions

```typescript
export interface TranslationSlice {
  // existing fields...
  scrollPosition: number           // NEW, default 0

  // existing actions...
  setScrollPosition: (n: number) => void  // NEW
}
```

- `scrollPosition` tracks the Y scroll offset of the scroll container in pixels
- Written by ScrollViewer on every scroll event (throttled via rAF inside ScrollViewer)
- `reset()` must reset `scrollPosition` to `0`

### No changes to existing fields

- `readingMode`, `displayMode`, `currentPage`, `totalPages`, `nextPage`, `prevPage` — all unchanged
- `nextPage`/`prevPage` remain page-mode only; scroll mode does not call them

---

## Keyboard Handler (`useReaderKeyboard.ts`)

### Interface

```typescript
interface UseReaderKeyboardOptions {
  onNextPage: () => void
  onPrevPage: () => void
  enabled: boolean
  readingMode: 'page' | 'scroll'   // NEW
}
```

### Key dispatch

| Key | Page mode | Scroll mode |
|-----|-----------|-------------|
| `ArrowLeft` | `onPrevPage()` | `onPrevPage()` |
| `ArrowRight` | `onNextPage()` | `onNextPage()` |
| `Space` | `onNextPage()` | *(ignored)* |

- `Space` is suppressed in scroll mode because ScrollViewer (MR82) owns its own keyboard handling for ArrowUp/ArrowDown/PageUp/PageDown/Space
- `ArrowLeft`/`ArrowRight` still dispatch `onPrevPage`/`onNextPage` in both modes — these trigger chapter-boundary logic at the route level
- Tag suppression (INPUT, TEXTAREA, contentEditable) applies unchanged
- Dependency array includes `readingMode` so the effect re-binds when mode changes

### Usage in route (MR83)

```typescript
useReaderKeyboard({
  onNextPage: handleNextPage,
  onPrevPage: handlePrevPage,
  enabled: pages.length > 0,
  readingMode,
})
```

---

## Data Flow

```
ScrollViewer (MR82)
  │
  ├── scroll event → rAF throttle → setScrollPosition(y)
  │
  └── internal useEffect for ArrowUp/Down/PgUp/PgDn/Space
        │
        └── scroll container ref.scrollBy(...)

Route (MR83)
  │
  ├── useReaderKeyboard (←/→/Space gated by readingMode)
  │     └── handleNextPage / handlePrevPage (chapter boundary)
  │
  └── reads scrollPosition from store (if needed for persistence)
```

---

## Files Changed

1. `frontend/src/stores/rootStore.ts` — add `scrollPosition`, `setScrollPosition`, update `initialState` and `reset()`
2. `frontend/src/hooks/useReaderKeyboard.ts` — add `readingMode` to options, gate Space in scroll mode

---

## Acceptance Criteria

- [ ] `scrollPosition` exists on store with default `0`
- [ ] `setScrollPosition(n)` updates the field
- [ ] `reset()` clears `scrollPosition` back to `0`
- [ ] `useReaderKeyboard` accepts `readingMode` in options
- [ ] Page mode: Space → onNextPage (unchanged)
- [ ] Scroll mode: Space is ignored by the global hook
- [ ] ArrowLeft/ArrowRight work identically in both modes
- [ ] Tag suppression applies to all keys regardless of mode
- [ ] `cd frontend && npm run build` passes with 0 errors
