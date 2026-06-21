# MR73: Reader Keyboard Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ArrowLeft`/`ArrowRight`/`Space` keyboard shortcuts to the manga reader page via a custom hook.

**Architecture:** Custom `useReaderKeyboard` hook sets up a `window` `keydown` listener. It takes `onNextPage`, `onPrevPage` callbacks and an `enabled` flag. The reader route passes store actions as callbacks. Suppression logic skips events when focus is in INPUT/TEXTAREA/contenteditable.

**Tech Stack:** React 19, TypeScript, Vitest, @testing-library/react

**Related Skills:** `react-testing-library`, `vitest`

---

### Task 1: Create `useReaderKeyboard` hook and its tests

**Skills:** `react-testing-library`, `vitest`

**Files:**
- Create: `frontend/src/hooks/useReaderKeyboard.ts`
- Create: `frontend/src/hooks/__tests__/useReaderKeyboard.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/hooks/__tests__/useReaderKeyboard.spec.tsx`:

```typescript
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReaderKeyboard } from '../useReaderKeyboard'

function dispatchKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function dispatchKeyWithTarget(key: string, target: HTMLElement) {
  window.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true }),
  )
  // Manually set target since we can't pass it through constructor
  // Instead, we test by calling the handler logic via the hook's response
}

describe('useReaderKeyboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onPrevPage when ArrowLeft is pressed', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))

    dispatchKey('ArrowLeft')

    expect(onPrevPage).toHaveBeenCalledTimes(1)
    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('calls onNextPage when ArrowRight is pressed', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))

    dispatchKey('ArrowRight')

    expect(onNextPage).toHaveBeenCalledTimes(1)
    expect(onPrevPage).not.toHaveBeenCalled()
  })

  it('calls onNextPage when Space is pressed', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))

    dispatchKey(' ')

    expect(onNextPage).toHaveBeenCalledTimes(1)
    expect(onPrevPage).not.toHaveBeenCalled()
  })

  it('does not call callbacks when enabled is false', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: false }))

    dispatchKey('ArrowLeft')
    dispatchKey('ArrowRight')
    dispatchKey(' ')

    expect(onPrevPage).not.toHaveBeenCalled()
    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('suppresses keyboard events when focus is in an INPUT element', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))

    const input = document.createElement('input')
    input.focus()

    dispatchKey('ArrowLeft')

    expect(onPrevPage).not.toHaveBeenCalled()
  })

  it('suppresses keyboard events when focus is in a TEXTAREA element', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))

    const textarea = document.createElement('textarea')
    textarea.focus()

    dispatchKey('ArrowRight')

    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('suppresses keyboard events when focus is in a contenteditable element', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))

    const div = document.createElement('div')
    div.contentEditable = 'true'
    div.focus()

    dispatchKey(' ')

    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('removes event listener on unmount', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    const { unmount } = renderHook(() =>
      useReaderKeyboard({ onNextPage, onPrevPage, enabled: true })
    )

    unmount()

    dispatchKey('ArrowRight')
    expect(onNextPage).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run src/hooks/__tests__/useReaderKeyboard.spec.tsx --no-cache 2>&1`
Expected: FAIL with "Cannot find module '../useReaderKeyboard'" (hook doesn't exist yet)

- [ ] **Step 3: Implement the hook**

Create `frontend/src/hooks/useReaderKeyboard.ts`:

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run src/hooks/__tests__/useReaderKeyboard.spec.tsx --no-cache 2>&1`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/hooks/useReaderKeyboard.ts frontend/src/hooks/__tests__/useReaderKeyboard.spec.tsx
git commit -m "feat: add useReaderKeyboard hook with ArrowLeft/ArrowRight/Space support (MR73)"
```

---

### Task 2: Integrate hook into reader route

**Skills:** (none needed — one-line integration)

**Files:**
- Modify: `frontend/src/routes/_reader/reader.$translationId.tsx`

- [ ] **Step 1: Add import and hook call**

Edit `frontend/src/routes/_reader/reader.$translationId.tsx`:

Add import at the top (after the existing imports):
```typescript
import { useReaderKeyboard } from '#/hooks/useReaderKeyboard'
```

Add the hook call after the `useReaderPages` call (after line 34):
```typescript
useReaderKeyboard({
  onNextPage: nextPage,
  onPrevPage: prevPage,
  enabled: pages.length > 0,
})
```

The edited section (lines 30-38) should look like:
```typescript
  const {
    pages,
    isLoading: pagesLoading,
    error: pagesError,
  } = useReaderPages(data?.url)

  useReaderKeyboard({
    onNextPage: nextPage,
    onPrevPage: prevPage,
    enabled: pages.length > 0,
  })

  if (isLoading) {
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npx vitest run --no-cache 2>&1`
Expected: PASS (all existing tests still pass)

- [ ] **Step 3: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/routes/_reader/reader.$translationId.tsx
git commit -m "feat: integrate useReaderKeyboard into reader route (MR73)"
```

---

### Task 3: Final verification

**Skills:** `vitest`

- [ ] **Step 1: Run full frontend test suite**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run test 2>&1`
Expected: All tests pass

- [ ] **Step 2: Run frontend build**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 3: Run type check**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run check`
Expected: 0 errors

- [ ] **Step 4: Run lint**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run lint`
Expected: 0 errors
