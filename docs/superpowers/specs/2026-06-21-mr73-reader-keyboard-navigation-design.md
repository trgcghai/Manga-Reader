# MR73: Reader Keyboard Navigation — Design

## Summary

Add keyboard navigation to the reader page via a custom hook `useReaderKeyboard` that listens for `ArrowLeft`, `ArrowRight`, and `Space` keys and maps them to prev/next page actions.

## Architecture

```
reader.$translationId.tsx
  └─ useReaderKeyboard({ onNextPage, onPrevPage, enabled })
       └─ useEffect → window.addEventListener('keydown', handleKeyDown)
            ├─ ArrowLeft  → e.preventDefault() → onPrevPage()
            ├─ ArrowRight → e.preventDefault() → onNextPage()
            ├─ Space      → e.preventDefault() → onNextPage()
            └─ Suppressed when focus is in INPUT, TEXTAREA, or [contenteditable]
```

The hook is passive — it does not render anything, does not touch the store directly, and does not modify `PageViewer`. It simply calls the provided callbacks when relevant keys are pressed.

## Detailed Changes

### 1. New hook — `useReaderKeyboard`

**File:** `frontend/src/hooks/useReaderKeyboard.ts`

```typescript
import { useEffect } from 'react'

interface UseReaderKeyboardOptions {
  onNextPage: () => void
  onPrevPage: () => void
  enabled: boolean
}

export function useReaderKeyboard({
  onNextPage,
  onPrevPage,
  enabled,
}: UseReaderKeyboardOptions): void {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

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
          e.preventDefault()
          onNextPage()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNextPage, onPrevPage, enabled])
}
```

Key behaviors:
- `enabled` flag prevents listener registration when no pages are loaded
- Tag-name check prevents conflicts with input elements
- `e.preventDefault()` prevents browser scroll for Space

### 2. Route integration

**File:** `frontend/src/routes/_reader/reader.$translationId.tsx`

- Add import: `import { useReaderKeyboard } from '#/hooks/useReaderKeyboard'`
- Add call after `useReaderPages`: `useReaderKeyboard({ onNextPage: nextPage, onPrevPage: prevPage, enabled: pages.length > 0 })`

No other changes to the route file.

### 3. Tests

**File:** `frontend/src/hooks/__tests__/useReaderKeyboard.spec.tsx`

8 test cases using `renderHook` from `@testing-library/react`:

| # | Test | Setup | Expect |
|---|------|-------|--------|
| 1 | ArrowLeft | dispatch keydown ArrowLeft | onPrevPage called |
| 2 | ArrowRight | dispatch keydown ArrowRight | onNextPage called |
| 3 | Space | dispatch keydown Space | onNextPage called |
| 4 | Suppressed in INPUT | focus in `<input>`, press ArrowLeft | neither called |
| 5 | Suppressed in TEXTAREA | focus in `<textarea>`, press ArrowRight | neither called |
| 6 | Suppressed in contenteditable | focus in `<div contenteditable>`, press Space | neither called |
| 7 | Disabled | `enabled: false`, press ArrowLeft | neither called |
| 8 | Cleanup | unmount hook, dispatch ArrowRight | neither called |

## Edge Cases

- **First page**: ArrowLeft and Space are safe — `store.prevPage()` clamps at 0, `nextPage()` clamps at last page
- **Last page**: ArrowRight is safe — clamps at `totalPages - 1`
- **Loading state**: `pages` is empty → `enabled` is `false` → no listener
- **Error state**: same as loading — no pages, no listener
- **Dialog open**: keyboard still works (no suppression for dialogs). If a dialog has an input, suppression kicks in via the tag check
- **Key repeat**: holding a key fires repeated `keydown` events — the store clamps to bounds, so it's safe without rate-limiting
