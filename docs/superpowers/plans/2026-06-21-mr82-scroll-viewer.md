# MR82: Scroll Viewer Component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the `ScrollViewer` component — a scrollable manga page viewer with single/double display mode, IntersectionObserver-based page tracking, internal keyboard scroll handling, and overscroll chapter resistance.

**Architecture:** A single new component file (`ScrollViewer.tsx`) that renders all pages vertically, tracks visible page via IntersectionObserver, handles scroll-key keyboard events internally, and shows overscroll resistance cues at chapter boundaries. Reuses `PageIndicator` from PageViewer.

**Tech Stack:** React 19, TypeScript, IntersectionObserver API

**Related skills:** `vercel-react-best-practices` (useRef, useEffect, IntersectionObserver patterns), `frontend-design` (UI polish for overscroll cues)

---

### Task 1: Create ScrollViewer component

**Files:**
- Create: `frontend/src/components/reader/ScrollViewer.tsx`

**Related skills:** `vercel-react-best-practices` — useRef/useEffect patterns, IntersectionObserver lifecycle management

- [ ] **Step 1: Create file with interfaces, imports, basic scroll container, and image rendering**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import { useReaderStore } from '#/stores/rootStore'

interface ScrollViewerProps {
  pages: string[]
  displayMode: 'single' | 'double'
  onPrevChapter: () => void
  onNextChapter: () => void
}

export function ScrollViewer({
  pages,
  displayMode,
  onPrevChapter,
  onNextChapter,
}: ScrollViewerProps) {
  const [errored, setErrored] = useState<Set<number>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const boundaryHitCount = useRef(0)
  const showCue = useRef<'prev' | 'next' | null>(null)
  const [, forceRender] = useState(0) // for cue overlay reactivity

  useEffect(() => {
    setErrored(new Set())
  }, [pages])

  function handleImgError(index: number) {
    setErrored((prev) => new Set(prev).add(index))
  }

  function renderPage(index: number, fullWidth?: boolean) {
    if (errored.has(index)) {
      return (
        <div
          key={`placeholder-${index}`}
          data-page-index={index}
          className="flex items-center justify-center bg-zinc-800 text-zinc-400 w-full aspect-[3/4]"
        >
          Page {index + 1}
        </div>
      )
    }
    const sizingClass =
      displayMode === 'single' || fullWidth
        ? 'w-full h-auto'
        : 'max-w-[50vw] max-h-screen object-contain'
    return (
      <img
        key={`img-${index}`}
        src={pages[index]}
        alt={`Page ${index + 1}`}
        className={sizingClass}
        onError={() => handleImgError(index)}
      />
    )
  }

  function renderContent() {
    if (displayMode === 'single') {
      return pages.map((_, i) => (
        <div key={`page-${i}`} data-page-index={i} className="w-full">
          {renderPage(i)}
        </div>
      ))
    }

    const spreads: React.ReactNode[] = []
    for (let i = 0; i < pages.length; i += 2) {
      const hasPair = i + 1 < pages.length
      spreads.push(
        <div key={`spread-${i}`} data-page-index={i} className="w-full">
          {hasPair ? (
            <div className="flex items-center justify-center gap-1">
              {renderPage(i)}
              {renderPage(i + 1)}
            </div>
          ) : (
            renderPage(i, true)
          )}
        </div>,
      )
    }
    return spreads
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        data-testid="scroll-viewer-container"
      >
        {renderContent()}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add IntersectionObserver for page detection**

Insert after the `useEffect` for errored reset:

```typescript
  useEffect(() => {
    const container = containerRef.current
    if (!container || pages.length === 0) return

    const sentinels = container.querySelectorAll('[data-page-index]')

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length > 0) {
          const first = intersecting.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0]
          const index = Number((first.target as HTMLElement).dataset.pageIndex)
          if (!isNaN(index)) {
            useReaderStore.getState().setCurrentPage(index)
          }
        }
      },
      {
        root: container,
        rootMargin: '-40% 0px -40% 0px',
        threshold: 0,
      },
    )

    sentinels.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [pages, displayMode])
```

- [ ] **Step 3: Add PageIndicator**

Import and render below the scroll container, inside the outer `relative` div:

```typescript
import { PageIndicator } from '#/components/reader/PageViewer'
// Note: PageIndicator is in PageViewer.tsx — import it directly

// In JSX, after the scroll container div:
<PageIndicator
  current={useReaderStore((s) => s.currentPage)}
  total={pages.length}
  displayMode={displayMode}
/>
```

Wait — `PageIndicator` is defined as a local function in `PageViewer.tsx`, not exported. Two options:

**Option A:** Extract `PageIndicator` to its own file and export from there
**Option B:** Define it inline in ScrollViewer (duplicate)

Follow the spec: "Reuse the existing PageIndicator component". So extract it.

- [ ] **Step 3a: Extract PageIndicator to a shared file**

Create `frontend/src/components/reader/PageIndicator.tsx`:

```typescript
interface PageIndicatorProps {
  current: number
  total: number
  displayMode?: 'single' | 'double'
}

export function PageIndicator({
  current,
  total,
  displayMode,
}: PageIndicatorProps) {
  const isDouble = displayMode === 'double'
  const right = Math.min(current + 2, total)
  const label = !isDouble || current + 1 === total || right === current + 1
    ? `${current + 1} / ${total}`
    : `${current + 1}-${right} / ${total}`

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full pointer-events-none select-none">
      {label}
    </div>
  )
}
```

- [ ] **Step 3b: Update PageViewer to import PageIndicator from shared file**

In `frontend/src/components/reader/PageViewer.tsx`:
- Remove the local `PageIndicator` function definition
- Add import: `import { PageIndicator } from './PageIndicator'`

- [ ] **Step 3c: Import and use PageIndicator in ScrollViewer**

Add import at top:
```typescript
import { PageIndicator } from './PageIndicator'
```

In ScrollViewer's return JSX, inside the outer `<div className="relative h-full">`:

```typescript
      <PageIndicator
        current={useReaderStore((s) => s.currentPage)}
        total={pages.length}
        displayMode={displayMode}
      />
```

But using a store selector in the render body is fine for a scalar — it auto-subscribes. However, to avoid re-rendering on every store change, a small local state or ref subscription might be better. For simplicity, the selector in JSX works since `currentPage` only changes on scroll events (throttled by nature).

- [ ] **Step 4: Add internal keyboard handler**

Add this useEffect after the observer useEffect:

```typescript
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const tag = target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target.contentEditable === 'true') return

      const viewportHeight = container.clientHeight
      let scrollAmount = 0

      switch (e.key) {
        case 'ArrowUp':
          scrollAmount = -viewportHeight * 0.9
          break
        case 'ArrowDown':
          scrollAmount = viewportHeight * 0.9
          break
        case 'PageUp':
          scrollAmount = -viewportHeight
          break
        case 'PageDown':
        case ' ':
          scrollAmount = viewportHeight
          break
        default:
          return
      }

      e.preventDefault()

      const currentTop = container.scrollTop
      const maxScroll = container.scrollHeight - container.clientHeight

      if (currentTop <= 0 && scrollAmount < 0) {
        // At top, trying to scroll up
        handleBoundaryScroll('prev')
        return
      }
      if (currentTop >= maxScroll - 1 && scrollAmount > 0) {
        // At bottom, trying to scroll down
        handleBoundaryScroll('next')
        return
      }

      container.scrollBy({ top: scrollAmount, behavior: 'smooth' })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pages, displayMode])
```

Note: uses `container.clientHeight` inside the handler (live value, no stale closure).

- [ ] **Step 5: Add overscroll resistance**

Add the `handleBoundaryScroll` function and cue state. Insert these before the return statement:

```typescript
  const [cue, setCue] = useState<'prev' | 'next' | null>(null)
  const cueTimerRef = useRef<ReturnType<typeof setTimeout>>()

  function handleBoundaryScroll(direction: 'prev' | 'next') {
    boundaryHitCount.current += 1
    setCue(direction)

    if (boundaryHitCount.current >= 2) {
      boundaryHitCount.current = 0
      setCue(null)
      if (direction === 'prev') onPrevChapter()
      else onNextChapter()
      return
    }

    clearTimeout(cueTimerRef.current)
    cueTimerRef.current = setTimeout(() => {
      boundaryHitCount.current = 0
      setCue(null)
    }, 2000)
  }
```

Also add a scroll listener on the container that resets the boundary count when user scrolls back into content:

```typescript
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleScroll() {
      if (boundaryHitCount.current > 0 && container.scrollTop > 0 && container.scrollTop < container.scrollHeight - container.clientHeight) {
        boundaryHitCount.current = 0
        setCue(null)
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])
```

Add the cue overlay inside the outer div, before the scroll container:

```typescript
      {cue === 'prev' && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
          <span className="text-white text-sm font-medium">↑ Previous Chapter</span>
        </div>
      )}
      {cue === 'next' && (
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
          <span className="text-white text-sm font-medium">↓ Next Chapter</span>
        </div>
      )}
```

Also update the keyboard handler's `handleBoundaryScroll` call — need to hoist the function outside the useEffect or use a ref. Since `handleBoundaryScroll` uses `setCue`, it should be a stable callback. Use `useCallback` or access the latest `pages/displayMode` via refs.

Better approach: use refs for callbacks to avoid stale closures in the keyboard effect.

Add refs near the top of the component:

```typescript
  const onPrevChapterRef = useRef(onPrevChapter)
  const onNextChapterRef = useRef(onNextChapter)
  onPrevChapterRef.current = onPrevChapter
  onNextChapterRef.current = onNextChapter
```

And in `handleBoundaryScroll`, call `onPrevChapterRef.current()` / `onNextChapterRef.current()`.

Also need `handleBoundaryScroll` itself to be stable — define it outside useEffect but use refs for callbacks:

```typescript
  function handleBoundaryScroll(direction: 'prev' | 'next') {
    boundaryHitCount.current += 1
    setCue(direction)

    if (boundaryHitCount.current >= 2) {
      boundaryHitCount.current = 0
      setCue(null)
      if (direction === 'prev') onPrevChapterRef.current()
      else onNextChapterRef.current()
      return
    }

    clearTimeout(cueTimerRef.current)
    cueTimerRef.current = setTimeout(() => {
      boundaryHitCount.current = 0
      setCue(null)
    }, 2000)
  }
```

- [ ] **Step 6: Add scroll-wheel overscroll detection**

The keyboard handler covers keys, but mouse wheel also needs overscroll resistance. Add a wheel event listener:

```typescript
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleWheel(e: WheelEvent) {
      const atTop = container.scrollTop <= 0
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 1

      if (atTop && e.deltaY < 0) {
        e.preventDefault()
        handleBoundaryScroll('prev')
        return
      }
      if (atBottom && e.deltaY > 0) {
        e.preventDefault()
        handleBoundaryScroll('next')
        return
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])
```

Note: `passive: false` required for `preventDefault()`.

- [ ] **Step 7: Verify build**

```bash
cd frontend && npm run build
```

Expected: 0 errors.

---

### Verification

- [ ] `npm run build` passes with 0 errors
- [ ] Manual: scroll container renders all pages vertically
- [ ] Manual: IntersectionObserver updates page indicator as user scrolls
- [ ] Manual: ArrowUp/Down/PageUp/PageDown/Space scroll correctly
- [ ] Manual: overscroll cue appears at boundaries, chapter fires on second attempt
- [ ] Manual: error handling shows placeholder for broken images
- [ ] Manual: single mode shows full-width pages, double mode shows spreads
