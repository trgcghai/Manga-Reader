# MR80: Fix Boundary and Landing for Double Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix chapter boundary detection and cross-chapter page landing for double-page display mode.

**Architecture:** Single file change to `reader.$translationId.tsx` — use `displayMode` (already destructured on line 33) to compute a dynamic step for the boundary check, and adjust the prev-chapter landing index for even-length chapters.

**Tech Stack:** React, TanStack Router, TypeScript.

---

### Task 1: Update boundary check and landing logic in reader route

**Skills:** tanstack-router-best-practices

**Files:**
- Modify: `frontend/src/routes/_reader/reader.$translationId.tsx:46-83`

- [ ] **Step 1: Read the current file**

Read `frontend/src/routes/_reader/reader.$translationId.tsx` to confirm current content.

- [ ] **Step 2: Update `handleNextPage` boundary check**

Change the condition inside `handleNextPage` from `totalPages - 1` to use a dynamic step:

```ts
const handleNextPage = useCallback(() => {
  const step = displayMode === 'double' ? 2 : 1
  if (currentPage < totalPages - step) {
    nextPage()
  } else if (data?.nextTranslationId) {
    pendingDirection.current = 'next'
    navigate({
      to: '/reader/$translationId',
      params: { translationId: String(data.nextTranslationId) },
    })
  } else {
    toast.info('This is the latest chapter')
  }
}, [currentPage, totalPages, nextPage, data?.nextTranslationId, navigate, displayMode])
```

Note: `displayMode` must be added to the dependency array.

- [ ] **Step 3: Update `pendingDirection` landing for prev chapter**

Change the `else` branch inside the `useEffect` to account for even-length chapters in double mode:

```ts
useEffect(() => {
  if (pages.length > 0 && pendingDirection.current) {
    if (pendingDirection.current === 'next') {
      setCurrentPage(0)
    } else {
      if (displayMode === 'double') {
        setCurrentPage(pages.length - 2 >= 0 ? pages.length - 2 : 0)
      } else {
        setCurrentPage(pages.length - 1)
      }
    }
    pendingDirection.current = null
  }
}, [pages, displayMode])
```

Note: `displayMode` must be added to the dependency array.

- [ ] **Step 4: Verify build passes**

Run: `cd frontend && npm run build`

Expected: Build succeeds with 0 errors (client + SSR).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/routes/_reader/reader.$translationId.tsx
git commit -m "feat: fix boundary logic and cross-chapter landing for double mode"
```
