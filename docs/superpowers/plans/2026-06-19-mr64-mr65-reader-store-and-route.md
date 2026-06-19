# MR64 + MR65: Reader Store and Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install Zustand, create a reader store (MR64), then build the reader layout, route, and API hook (MR65).

**Architecture:** Zustand store with `StateCreator` slice pattern → `_reader` layout (full-screen dark) → `reader.$translationId` page fetches translation via TanStack Query.

**Tech Stack:** Zustand, TanStack Router, TanStack Query, React 19, Vite, shadcn/ui

---

### Task 1: Install Zustand and Create Reader Store (MR64)

**Skills:** Use `zustand` skill before writing store code.

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/stores/rootStore.ts`
- Create: `frontend/src/types/translation.ts`

- [ ] **Step 1: Install zustand**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm install zustand`

- [ ] **Step 2: Create `TranslationDetailResponse` type**

Create `frontend/src/types/translation.ts`:

```typescript
export interface TranslationDetailResponse {
  id: number;
  url: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };
}
```

- [ ] **Step 3: Create stores/ directory**

Run: `mkdir -p F:\Cntt\vibe\manga-reader\frontend\src\stores`

- [ ] **Step 4: Create `rootStore.ts` with `translationSlice`**

Create `frontend/src/stores/rootStore.ts`:

```typescript
import { create } from 'zustand'
import type { StateCreator } from 'zustand'
import type { TranslationDetailResponse } from '#/types/translation'

export interface TranslationSlice {
  currentTranslation: TranslationDetailResponse | null
  currentChapter: {
    id: number
    number: number
    title?: string
    mangaId: number
    mangaTitle: string
  } | null
  currentPage: number
  totalPages: number
  readingMode: 'page' | 'scroll'
  displayMode: 'single' | 'double'

  setCurrentTranslation: (t: TranslationDetailResponse) => void
  setCurrentPage: (n: number) => void
  setTotalPages: (n: number) => void
  setReadingMode: (mode: 'page' | 'scroll') => void
  setDisplayMode: (mode: 'single' | 'double') => void
  nextPage: () => void
  prevPage: () => void
  reset: () => void
}

const initialState = {
  currentTranslation: null,
  currentChapter: null,
  currentPage: 0,
  totalPages: 0,
  readingMode: 'page' as const,
  displayMode: 'single' as const,
}

export const translationSlice: StateCreator<TranslationSlice, [], [], TranslationSlice> = (set, get) => ({
  ...initialState,

  setCurrentTranslation: (t) =>
    set({
      currentTranslation: t,
      currentChapter: {
        id: t.chapter.id,
        number: t.chapter.number,
        title: t.chapter.title,
        mangaId: t.chapter.manga.id,
        mangaTitle: t.chapter.manga.title,
      },
    }),

  setCurrentPage: (n) => set({ currentPage: n }),

  setTotalPages: (n) => set({ totalPages: n }),

  setReadingMode: (mode) => set({ readingMode: mode }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  nextPage: () =>
    set((state) => ({
      currentPage: Math.min(state.currentPage + 1, state.totalPages - 1),
    })),

  prevPage: () =>
    set((state) => ({
      currentPage: Math.max(state.currentPage - 1, 0),
    })),

  reset: () => set({ ...initialState }),
})

export const useReaderStore = create<TranslationSlice>()(translationSlice)
```

- [ ] **Step 5: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/package.json frontend/package-lock.json frontend/src/stores/ frontend/src/types/translation.ts
git commit -m "feat: install zustand and create reader store (MR64)"
```

---

### Task 2: Add API Function and Hook (MR65 — part 1)

**Skills:** Use `tanstack-query-best-practices` skill before writing the hook.

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`
- Modify: `frontend/src/hooks/useManga.ts`

- [ ] **Step 1: Add `getTranslation` API function**

Add to `frontend/src/services/api/mangaApi.ts`:

```typescript
import type { TranslationDetailResponse } from '#/types/translation'

export async function getTranslation(
  id: number,
): Promise<TranslationDetailResponse> {
  const res = await axiosInstance.get<TranslationDetailResponse>(
    `/mangas/translations/${id}`,
  )
  return res.data
}
```

- [ ] **Step 2: Add `useTranslation` hook**

Add to `frontend/src/hooks/useManga.ts`:

```typescript
import { getTranslation } from '#/services/api/mangaApi'
import type { TranslationDetailResponse } from '#/types/translation'

export function useTranslation(id: number) {
  return useQuery<TranslationDetailResponse>({
    queryKey: ['manga', 'translations', id],
    queryFn: () => getTranslation(id),
    enabled: !!id,
  })
}
```

- [ ] **Step 3: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/services/api/mangaApi.ts frontend/src/hooks/useManga.ts
git commit -m "feat: add getTranslation API and useTranslation hook (MR65)"
```

---

### Task 3: Create Reader Layout Route (MR65 — part 2)

**Skills:** Use `tanstack-router-best-practices` skill before creating routes. Use `frontend-design` skill for the reader layout design.

**Files:**
- Create: `frontend/src/routes/_reader.tsx`

- [ ] **Step 1: Create the reader layout route**

Create `frontend/src/routes/_reader.tsx`:

```typescript
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_reader')({
  component: ReaderLayout,
})

function ReaderLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/routes/_reader.tsx
git commit -m "feat: create full-screen reader layout (MR65)"
```

---

### Task 4: Create Reader Page Route (MR65 — part 3)

**Skills:** Use `tanstack-router-best-practices` skill before creating route. Use `frontend-design` skill for the page layout.

**Files:**
- Create: `frontend/src/routes/_reader/reader.$translationId.tsx`
- Modify: `frontend/src/routeTree.gen.ts` (via `npm run generate-routes`)

- [ ] **Step 1: Create the reader page route**

Create `frontend/src/routes/_reader/reader.$translationId.tsx`:

```typescript
import { createFileRoute, useParams } from '@tanstack/react-router'
import { useTranslation } from '#/hooks/useManga'
import { Skeleton } from '#/components/ui/skeleton'
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '#/components/ui/error-display'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/_reader/reader/$translationId')({
  component: ReaderPage,
})

function ReaderPage() {
  const { translationId } = useParams({ from: '/_reader/reader/$translationId' })
  const { data, isLoading, isError, refetch } = useTranslation(Number(translationId))

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 w-96">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Reader</ErrorTitle>
          <ErrorDescription>
            Could not fetch translation data. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()} variant="default">Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">{data.chapter.manga.title}</h1>
      <p className="text-zinc-400">
        Chapter {data.chapter.number}{data.chapter.title ? ` — ${data.chapter.title}` : ''}
      </p>
      <p className="text-zinc-500 mt-2">
        {data.language.name} · {data.translator.name}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Regenerate route tree**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run generate-routes`
Expected: `routeTree.gen.ts` updated

- [ ] **Step 3: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/routes/_reader/ frontend/src/routeTree.gen.ts
git commit -m "feat: create reader page route with loading/error/data states (MR65)"
```

---

### Task 5: Full Verification

**Skills:** Use `verification-before-completion` skill before claiming completion.

- [ ] **Step 1: Run full frontend build**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 2: Run lint**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run lint`
Expected: No lint errors

- [ ] **Step 3: Run type check**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run check`
Expected: 0 errors

- [ ] **Step 4: Run tests**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm test`
Expected: All tests green

- [ ] **Step 5: Final commit if any fixes**

```bash
cd F:\Cntt\vibe\manga-reader
git add -A
git commit -m "chore: fix lint/type issues after MR64+MR65"
```
