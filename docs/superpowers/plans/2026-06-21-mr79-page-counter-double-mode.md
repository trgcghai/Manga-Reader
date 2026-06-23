# MR79: Fix Page Counter for Double Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show range-based page counter ("1-2 / 5") in double mode instead of single index ("1 / 5").

**Architecture:** Single file change to `PageViewer.tsx` — add optional `displayMode` prop to `PageIndicator`, render range when both pages of a spread are visible.

**Tech Stack:** React, TypeScript.

---

### Task 1: Update PageIndicator in PageViewer

**Skills:** frontend-design, shadcn

**Files:**
- Modify: `frontend/src/components/reader/PageViewer.tsx:11-17`

- [ ] **Step 1: Update `PageIndicator` to accept and use `displayMode`**

Change the component signature and rendering logic:

```tsx
function PageIndicator({
  current,
  total,
  displayMode,
}: {
  current: number
  total: number
  displayMode?: 'single' | 'double'
}) {
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

- [ ] **Step 2: Pass `displayMode` from `PageViewer` to `PageIndicator`**

Find the `<PageIndicator>` call in `PageViewer.tsx:97` and add the prop:

```tsx
<PageIndicator current={clampedPage} total={pages.length} displayMode={displayMode} />
```

- [ ] **Step 3: Verify build passes**

Run: `cd frontend && npm run build`

Expected: Build succeeds with 0 errors (client + SSR).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/reader/PageViewer.tsx
git commit -m "feat: show range-based page counter in double mode"
```
