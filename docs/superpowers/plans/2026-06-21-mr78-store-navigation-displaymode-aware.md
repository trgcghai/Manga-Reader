# MR78: Store Navigation displayMode-Aware — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `nextPage()` / `prevPage()` advance `currentPage` by 2 when `displayMode === 'double'`.

**Architecture:** Single-file change to `rootStore.ts` — read `state.displayMode` inside the existing `set` callback to determine step size (1 for single, 2 for double). No new API surface, no new files.

**Tech Stack:** Zustand store, TypeScript.

---

### Task 1: Update `nextPage` and `prevPage` in rootStore

**Skills:** zustand

**Files:**
- Modify: `frontend/src/stores/rootStore.ts:66-77`

- [ ] **Step 1: Modify `nextPage`**

Change the `nextPage` action to read `state.displayMode` for step size:

```ts
nextPage: () =>
  set((state) => ({
    currentPage:
      state.totalPages === 0
        ? state.currentPage
        : Math.min(
            state.currentPage + (state.displayMode === 'double' ? 2 : 1),
            state.totalPages - 1,
          ),
  })),
```

- [ ] **Step 2: Modify `prevPage`**

Change the `prevPage` action similarly:

```ts
prevPage: () =>
  set((state) => ({
    currentPage: Math.max(
      state.currentPage - (state.displayMode === 'double' ? 2 : 1),
      0,
    ),
  })),
```

- [ ] **Step 3: Verify build passes**

Run: `cd frontend && npm run build`

Expected: Build succeeds with 0 errors (client + SSR).

- [ ] **Step 4: Verify tests pass**

Run: `cd frontend && npm run test`

Expected: All tests pass (0 failures).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/rootStore.ts
git commit -m "feat: make nextPage/prevPage displayMode-aware, advance by 2 in double mode"
```
