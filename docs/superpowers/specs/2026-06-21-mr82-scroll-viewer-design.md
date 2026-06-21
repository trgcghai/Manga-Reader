# MR82: Scroll Viewer Component — Design Spec

## Overview

New `ScrollViewer` component renders all manga pages vertically in a scrollable container with single/double display mode support, IntersectionObserver-based page tracking, internal keyboard handling for scroll keys, and overscroll resistance at chapter boundaries.

---

## Component Interface

```typescript
interface ScrollViewerProps {
  pages: string[]
  displayMode: 'single' | 'double'
  onPrevChapter: () => void
  onNextChapter: () => void
}
```

- No `currentPage` prop — visible page derived internally, synced to store
- Internal keyboard handler — no refs exposed to parent
- Renders in place of `PageViewer` when `readingMode === 'scroll'`

---

## Image Sizing

| Mode | Layout | Sizing |
|------|--------|--------|
| Single | Stacked vertically | `w-full h-auto` — natural aspect ratio, container width |
| Double spread (pairs) | Flex row, side-by-side | Each `max-w-[50vw] max-h-screen object-contain` |
| Double solo (last odd) | Centered, full-width | `max-h-screen max-w-full object-contain` |

---

## Scroll Container

- Full-height, `overflow-y-auto`, natural document flow
- Images stack vertically with no gaps
- No viewport-height constraints (except double spreads which cap at `max-h-screen`)

---

## Page Detection (IntersectionObserver)

- A sentinel `<div>` wraps each page (single) or each spread (double)
- Observer config:
  - `rootMargin: '-40% 0px -40% 0px'` — middle 20% of viewport is the detection zone
  - `threshold: 0` — any intersection in the zone triggers
- On intersection change, find the first entry with `isIntersecting: true` → map entry's `dataset.pageIndex` to `pageIndex` → call `useReaderStore.getState().setCurrentPage(pageIndex)`
- Observer re-connects when `pages` or `displayMode` changes
- Cleanup: disconnect observer on unmount

---

## Internal Keyboard Handling

ScrollViewer owns a `useEffect` with `keydown` listener (tag suppression applies):

| Key | Action |
|-----|--------|
| `ArrowUp` | `scrollBy(0, -viewportHeight * 0.9)` |
| `ArrowDown` | `scrollBy(0, viewportHeight * 0.9)` |
| `PageUp` | `scrollBy(0, -viewportHeight)` |
| `PageDown` / `Space` | `scrollBy(0, viewportHeight)` |

Boundary behavior: same overscroll resistance as mouse/scroll (see below).

---

## Overscroll Resistance at Chapter Boundaries

When the user reaches the top or bottom of the scroll container and attempts to scroll further (mouse wheel, touch drag, or keyboard at limit):

- **Visual cue:** A semi-transparent overlay with centered text appears:
  - Top boundary: `"↑ Previous Chapter"`
  - Bottom boundary: `"↓ Next Chapter"`
- **Threshold:** On the **second consecutive attempt** to scroll past the boundary, the chapter action fires immediately (`onPrevChapter()` / `onNextChapter()`)
- **Cue dismisses:** when chapter navigation fires or user returns to content

Implementation:
- Track a `boundaryHitCount` ref, incremented on each scroll/key event that would exceed the limit
- When `boundaryHitCount >= 2`, call the chapter callback and reset
- `boundaryHitCount` resets to 0 if user scrolls back into content
- Cue overlay is shown when `boundaryHitCount >= 1`

---

## Error Handling

- Per-image error tracking via `useState<Set<number>>` (same pattern as PageViewer)
- `onError` replaces image with a placeholder: centered "Page N" text, dark background
- Reset errored set when `pages` array changes

---

## PageIndicator

- Reuse the existing `PageIndicator` component from PageViewer
- Rendered as absolute overlay at bottom-center (same position as PageViewer)
- Updates reactively as `currentPage` changes in store

---

## Files

1. **Create:** `frontend/src/components/reader/ScrollViewer.tsx`

---

## Acceptance Criteria

- [ ] ScrollViewer renders all pages vertically in a scrollable container
- [ ] Single mode: full-width, natural-height images stacked
- [ ] Double mode: spreads side-by-side, solo page centered full-width
- [ ] IntersectionObserver detects visible page and syncs to store
- [ ] ArrowUp/Down/PageUp/PageDown/Space scroll the container appropriately
- [ ] ArrowLeft/Right are NOT handled (left to global hook for chapter nav)
- [ ] Overscroll resistance: cue appears on first boundary hit, fires on second
- [ ] Error handling replaces failed images with placeholder
- [ ] PageIndicator shows and updates during scroll
- [ ] Observer re-connects on pages/displayMode change
- [ ] Cleanup on unmount (observer disconnect, event listeners)
- [ ] `cd frontend && npm run build` passes with 0 errors
