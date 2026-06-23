# MR83: Route Integration & Settings Sheet Updates — Design Spec

## Overview

Wire `readingMode` in the reader route to conditionally render `PageViewer` vs `ScrollViewer`, pass `readingMode` to the keyboard hook, and show a side-by-side navigation reference in the settings sheet for both page and scroll modes.

---

## Section 1: Route Integration

### File: `frontend/src/routes/_reader/reader.$translationId.tsx`

**New import:**
```typescript
import { ScrollViewer } from '#/components/reader/ScrollViewer'
```

**Read `readingMode` from store** alongside existing destructuring:
```typescript
const { currentPage, displayMode, totalPages, readingMode, setCurrentPage } =
  useReaderStore()
```

**Pass `readingMode` to keyboard hook:**
```typescript
useReaderKeyboard({
  onNextPage: handleNextPage,
  onPrevPage: handlePrevPage,
  enabled: pages.length > 0,
  readingMode,
})
```

**Conditional rendering** — replace the single `PageViewer` with a switch:
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

### No other route changes

- `handleNextPage`/`handlePrevPage` already encapsulate chapter-boundary logic — unchanged
- `pendingDirection` effect unchanged (handles landing after chapter cross)
- The `ScrollViewer` receives the same `handlePrevPage`/`handleNextPage` as `onPrevChapter`/`onNextChapter`

---

## Section 2: Settings Sheet Navigation

### File: `frontend/src/components/reader/ReaderSettingsSheet.tsx`

**New imports:**
```typescript
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Settings } from 'lucide-react'
```

**Navigation section redesigned** as a two-column grid showing both modes simultaneously:

```
┌─────────────────────────────────┐
│  NAVIGATION                     │
│                                 │
│  Page Mode     │  Scroll Mode   │
│  ┌────────────┐│  ┌────────────┐│
│  │ → / Space  ││  │ ↑ / PgUp   ││
│  │ Next Page  ││  │ Scroll Up  ││
│  │────────────││  │────────────││
│  │ ←         ││  │ ↓ / PgDn   ││
│  │ Prev Page  ││  │ / Space    ││
│  │            ││  │ Scroll Down││
│  │            ││  │────────────││
│  │            ││  │ ←         ││
│  │            ││  │ Prev Chap  ││
│  │            ││  │────────────││
│  │            ││  │ →         ││
│  │            ││  │ Next Chap  ││
│  └────────────┘│  └────────────┘│
└─────────────────────────────────┘
```

Each column has a subheading ("Page Mode" / "Scroll Mode"), rendered as `text-xs font-medium text-muted-foreground`. Each column contains a `Command` component with `CommandList`/`CommandGroup`/`CommandItem` entries.

---

## Files Changed

1. `frontend/src/routes/_reader/reader.$translationId.tsx` — import ScrollViewer, read readingMode, conditional render, pass readingMode to hook
2. `frontend/src/components/reader/ReaderSettingsSheet.tsx` — two-column navigation, import ArrowUp/ArrowDown

---

## Acceptance Criteria

- [ ] `readingMode` read from store in route
- [ ] `readingMode` passed to `useReaderKeyboard`
- [ ] `readingMode === 'page'`: renders `PageViewer` (unchanged behavior)
- [ ] `readingMode === 'scroll'`: renders `ScrollViewer`
- [ ] `ScrollViewer` receives `onPrevChapter`/`onNextChapter` wired to `handlePrevPage`/`handleNextPage`
- [ ] Settings sheet shows two-column navigation with page and scroll mode shortcuts
- [ ] Both columns visible simultaneously regardless of current reading mode
- [ ] `cd frontend && npm run build` passes with 0 errors
