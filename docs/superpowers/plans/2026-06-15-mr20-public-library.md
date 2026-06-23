# MR20 — Public Library Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` route placeholder with a responsive cover grid of manga cards with pagination.

**Architecture:** Three focused files: a card component (`MangaCoverCard`), a page component (`LibraryPage`) that owns pagination state and renders loading/error/empty/data states, and a minimal route file that mounts it.

**Tech Stack:** TanStack Router, React, Tailwind, shadcn/ui (Card surface, Skeleton, Empty, ErrorDisplay, Pagination, Badge), TanStack Query (`useMangaList`), lucide-react icons.

---

### Task 1: Create MangaCoverCard component

**Skills:** `frontend-design`, `shadcn`

**Files:**
- Create: `frontend/src/components/manga/MangaCoverCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { MangaResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface MangaCoverCardProps {
  manga: MangaResponse
}

const badgeVariant = (status: string) =>
  status === 'completed'
    ? 'default'
    : status === 'ongoing'
      ? 'outline'
      : 'destructive'

export function MangaCoverCard({ manga }: MangaCoverCardProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="aspect-[3/4] overflow-hidden rounded-t-lg bg-muted">
        {manga.coverPath ? (
          <img
            src={manga.coverPath}
            alt={manga.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen className="size-12 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="font-semibold leading-tight line-clamp-2">
          {manga.title}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {manga.authors.map((a) => a.name).join(', ')}
        </p>
        <Badge variant={badgeVariant(manga.status)} className="capitalize">
          {manga.status}
        </Badge>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

```bash
cd frontend && npm run build
```

Expected: Compiles without errors.

---

### Task 2: Create LibraryPage component

**Skills:** `frontend-design`, `tanstack-query-best-practices`, `vercel-react-best-practices`

**Files:**
- Create: `frontend/src/components/manga/LibraryPage.tsx`

- [ ] **Step 1: Write the LibraryPage component**

```tsx
import { useState } from 'react'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
import { MangaCoverCard } from '#/components/manga/MangaCoverCard'
import { Pagination } from '#/components/ui/pagination'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ErrorDisplay,
  ErrorTitle,
  ErrorDescription,
} from '#/components/ui/error-display'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { BookOpen } from 'lucide-react'
import { Button } from '#/components/ui/button'

export function LibraryPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data, isLoading, isError, refetch } = useMangaList(page, pageSize)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border">
            <Skeleton className="aspect-[3/4] rounded-t-lg" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorDisplay>
        <ErrorTitle>Failed to Load Library</ErrorTitle>
        <ErrorDescription>
          Could not fetch manga list. The backend may be unavailable.
        </ErrorDescription>
        <Button onClick={() => refetch()}>Retry</Button>
      </ErrorDisplay>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No mangas in the library yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
        {data.data.map((manga: MangaResponse) => (
          <MangaCoverCard key={manga.id} manga={manga} />
        ))}
      </div>

      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        totalItems={data.total}
        pageSize={data.limit}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

```bash
cd frontend && npm run build
```

Expected: Compiles without errors.

---

### Task 3: Update index route

**Skills:** `tanstack-router-best-practices`

**Files:**
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Replace placeholder content**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { LibraryPage } from '#/components/manga/LibraryPage'

export const Route = createFileRoute('/')({ component: LibraryPage })
```

Delete the old `export function Home()`.

- [ ] **Step 2: Build to verify**

```bash
cd frontend && npm run build
```

Expected: Compiles without errors.

---

### Task 4: Verification

**Skills:** `verification-before-completion`

- [ ] **Step 1: Full frontend build**

```bash
cd frontend && npm run build
```

Expected: client + SSR build clean, no errors.

- [ ] **Step 2: Git status and commit**

```bash
git status
git add frontend/src/components/manga/MangaCoverCard.tsx frontend/src/components/manga/LibraryPage.tsx frontend/src/routes/index.tsx
git commit -m "feat: add public library page with cover grid and pagination"
```
