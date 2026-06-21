# MR76: Chapter Boundary Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the reader reaches the first or last page of a chapter via keyboard (ArrowLeft/ArrowRight/Space) or mouse click (PageViewer tap zones), navigate to the adjacent chapter translation or show a toast if at the manga boundary.

**Architecture:** All boundary logic lives in route-level `useCallback` wrappers (`handleNextPage`/`handlePrevPage`) in `reader.$translationId.tsx`. These replace the raw store actions passed to both `PageViewer` and `useReaderKeyboard`. Neither component changes — they just call whatever function they receive.

**Tech Stack:** TanStack Router (`useNavigate`), Zustand store (`nextPage`/`prevPage`/`currentPage`/`totalPages`), sonner (`toast`), React (`useCallback`).

**Spec:** `docs/superpowers/specs/2026-06-21-mr76-chapter-boundary-navigation-design.md`

---

### Task 1: Add boundary-aware wrapper functions to the reader route

**Skills:** `tanstack-router-best-practices` (for typed `useNavigate` pattern), `vercel-react-best-practices` (for correct `useCallback` dependency management)

**Files:**
- Modify: `frontend/src/routes/_reader/reader.$translationId.tsx`

- [ ] **Step 1: Add imports**

  Add `useNavigate` and `useCallback` at the top of the file alongside existing TanStack Router imports. Add `toast` from `sonner`:

  ```tsx
  import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router'
  // ... existing imports ...
  import { useCallback } from 'react'
  import { toast } from 'sonner'
  ```

- [ ] **Step 2: Add `useNavigate` call**

  After the existing store selectors (`nextPage`, `prevPage`), add:

  ```tsx
  const navigate = useNavigate()
  ```

- [ ] **Step 3: Create `handleNextPage` callback**

  After `prevPage` selector and before `useReaderKeyboard`, add:

  ```tsx
  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      nextPage()
    } else if (data?.nextTranslationId != null) {
      navigate({
        to: '/reader/$translationId',
        params: { translationId: String(data.nextTranslationId) },
      })
    } else {
      toast.info('This is the latest chapter')
    }
  }, [currentPage, totalPages, nextPage, data?.nextTranslationId, navigate])
  ```

- [ ] **Step 4: Create `handlePrevPage` callback**

  After `handleNextPage`, add:

  ```tsx
  const handlePrevPage = useCallback(() => {
    if (currentPage > 0) {
      prevPage()
    } else if (data?.prevTranslationId != null) {
      navigate({
        to: '/reader/$translationId',
        params: { translationId: String(data.prevTranslationId) },
      })
    } else {
      toast.info('This is the first chapter')
    }
  }, [currentPage, prevPage, data?.prevTranslationId, navigate])
  ```

- [ ] **Step 5: Replace raw store actions in the JSX**

  Update `useReaderKeyboard` call — replace `nextPage`/`prevPage` with `handleNextPage`/`handlePrevPage`:

  ```tsx
  useReaderKeyboard({
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    enabled: pages.length > 0,
  })
  ```

  Update `PageViewer` props — replace `nextPage`/`prevPage` with `handleNextPage`/`handlePrevPage`:

  ```tsx
  <PageViewer
    pages={pages}
    displayMode={displayMode}
    currentPage={currentPage}
    onNextPage={handleNextPage}
    onPrevPage={handlePrevPage}
  />
  ```

- [ ] **Step 6: Run build and tests**

  ```bash
  cd frontend && npm run build
  ```

  Expected: Build succeeds with 0 errors.

  ```bash
  cd frontend && npm run test
  ```

  Expected: All tests pass (0 failures, 0 pending with failures).

### Task 2: Verify behavior manually

- [ ] **Step 1: Start backend and frontend**

  ```bash
  # Terminal 1
  cd backend && npm run start:dev
  # Terminal 2
  cd frontend && npm run dev
  ```

- [ ] **Step 2: Manual checks**

  - Open a translation that has prev/next translations
  - Go to page 0, press ArrowLeft → should navigate to prev translation
  - Go to last page, press ArrowRight → should navigate to next translation
  - Go to last page, press Space → should navigate to next translation
  - Go to page 0, click left edge of PageViewer → should navigate to prev translation
  - Go to last page, click right edge → should navigate to next translation
  - Check first/last manga chapters: toast should appear ("This is the first chapter" / "This is the latest chapter")
