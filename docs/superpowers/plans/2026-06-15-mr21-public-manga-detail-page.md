# MR21 — Public Manga Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a public manga detail page at `/_app/manga/$mangaId` with cover, metadata, and a chapter list showing translations.

**Architecture:** New route file under `_app/manga/` uses `useManga` to fetch `MangaDetailResponse` with chapters+translations. Two new presentational components: `MangaDetailHeader` (cover + metadata sidebar) and `ChapterList` (chapter rows with translation info). The library page wraps MangaCard in a `<Link>` to the new route.

**Tech Stack:** TanStack Router (route), TanStack Query (data), shadcn Card/Badge/Skeleton, lucide-react (icons)

---

### Task 1: Create MangaDetailHeader component

**Related Skills:** `frontend-design`, `verification-before-completion`

**Files:**
- Create: `frontend/src/components/manga/MangaDetailHeader.tsx`

- [ ] **Step 1: Read existing MangaCard and MangaResponse types for reference**

Read these files to understand the existing patterns:
- `frontend/src/components/manga/MangaCard.tsx`
- `frontend/src/services/api/mangaApi.ts` (for MangaDetailResponse type)

- [ ] **Step 2: Create MangaDetailHeader component**

```tsx
import type { MangaDetailResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen } from 'lucide-react'
import { getStatusVariant } from '#/lib/mangaUtils'

interface MangaDetailHeaderProps {
  manga: MangaDetailResponse
}

export function MangaDetailHeader({ manga }: MangaDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="shrink-0 md:w-72">
        {manga.coverPath ? (
          <img
            src={manga.coverPath}
            alt={manga.title}
            className="aspect-[3/4] w-full rounded-xl object-cover shadow-md"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-muted">
            <BookOpen className="size-16 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex items-start gap-3">
          <h1 className="font-serif text-3xl font-bold leading-tight">
            {manga.title}
          </h1>
          <Badge variant={getStatusVariant(manga.status)} className="mt-1.5 shrink-0 capitalize">
            {manga.status}
          </Badge>
        </div>

        {manga.authors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-sm text-muted-foreground">Authors:</span>
            {manga.authors.map((a) => (
              <Badge key={a.id} variant="secondary">
                {a.name}
              </Badge>
            ))}
          </div>
        )}

        {manga.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-sm text-muted-foreground">Genres:</span>
            {manga.genres.map((g) => (
              <Badge key={g.id} variant="secondary">
                {g.name}
              </Badge>
            ))}
          </div>
        )}

        {manga.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {manga.description}
          </p>
        )}

        {manga.alternativeTitles.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Also known as:</span>{' '}
            {manga.alternativeTitles.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
mkdir -p frontend/src/components/manga
git add frontend/src/components/manga/MangaDetailHeader.tsx
git commit -m "feat: add MangaDetailHeader component with cover and metadata"
```

---

### Task 2: Create ChapterList component

**Related Skills:** `frontend-design`, `verification-before-completion`

**Files:**
- Create: `frontend/src/components/manga/ChapterList.tsx`

- [ ] **Step 1: Read ChapterDetail type**

Check `ChapterDetail` and `TranslationDetail` interfaces in `frontend/src/services/api/mangaApi.ts`.

- [ ] **Step 2: Create ChapterList component**

```tsx
import type { ChapterDetail } from '#/services/api/mangaApi'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { BookOpen } from 'lucide-react'

interface ChapterListProps {
  chapters: ChapterDetail[]
}

export function ChapterList({ chapters }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No chapters yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Chapters</h2>
      <div className="space-y-2">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="flex gap-4 rounded-lg border p-4"
          >
            <span className="mt-0.5 shrink-0 font-mono text-sm text-muted-foreground">
              #{chapter.number}
            </span>
            <div className="min-w-0 flex-1">
              {chapter.title && (
                <p className="truncate font-medium">{chapter.title}</p>
              )}
              {chapter.translations.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {chapter.translations.map((tr) => (
                    <p
                      key={tr.id}
                      className="truncate text-sm text-muted-foreground"
                    >
                      {tr.language.name} by {tr.translator.name}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/manga/ChapterList.tsx
git commit -m "feat: add ChapterList component with translation info"
```

---

### Task 3: Create manga detail route

**Related Skills:** `tanstack-router-best-practices`, `verification-before-completion`

**Files:**
- Create: `frontend/src/routes/_app/manga/$id.tsx`

- [ ] **Step 1: Read the library page and existing route patterns**

Read `frontend/src/routes/_app/index.tsx` to understand pattern for route definition, data fetching, and state handling.

- [ ] **Step 2: Create the route file**

```tsx
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { useManga } from '#/hooks/useManga'
import type { MangaDetailResponse } from '#/services/api/mangaApi'
import { MangaDetailHeader } from '#/components/manga/MangaDetailHeader'
import { ChapterList } from '#/components/manga/ChapterList'
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
import { Button } from '#/components/ui/button'
import { ArrowLeft, BookOpen } from 'lucide-react'

export const Route = createFileRoute('/_app/manga/$id')({
  component: MangaDetailPage,
})

function MangaDetailPage() {
  const { id } = useParams({ from: '/_app/manga/$id' })
  const mangaId = Number(id)
  const { data, isLoading, isError, refetch } = useManga(mangaId, {
    include: 'chapters,translations',
  })
  const manga = data as MangaDetailResponse | undefined

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-5 w-32" />
        <div className="flex flex-col gap-6 md:flex-row">
          <Skeleton className="aspect-[3/4] w-full rounded-xl md:w-72" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Library
        </Link>
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Manga</ErrorTitle>
          <ErrorDescription>
            Could not fetch manga details. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()}>Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  if (!manga) {
    return (
      <div>
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Library
        </Link>
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Manga not found</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Library
      </Link>

      <MangaDetailHeader manga={manga} />
      <ChapterList chapters={manga.chapters} />
    </div>
  )
}
```

- [ ] **Step 3: Create the directory and file**

```bash
mkdir -p frontend/src/routes/_app/manga
```

Then write the file.

- [ ] **Step 4: Generate route tree**

```bash
cd frontend && npm run generate-routes 2>&1 | tail -5
```

- [ ] **Step 5: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...ms`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/routes/_app/manga/$id.tsx frontend/src/routeTree.gen.ts
git commit -m "feat: add public manga detail route at /_app/manga/:id"
```

---

### Task 4: Link MangaCard to detail page

**Related Skills:** `tanstack-router-best-practices`, `verification-before-completion`

**Files:**
- Modify: `frontend/src/routes/_app/index.tsx`

- [ ] **Step 1: Read the library page**

Read `frontend/src/routes/_app/index.tsx` to understand the current MangaCard rendering and add Link wrapper.

- [ ] **Step 2: Add Link import and wrap MangaCard**

Add `Link` to the TanStack Router imports (or check if already imported):

```tsx
import { Link, createFileRoute } from '@tanstack/react-router'
```

Find the MangaCard rendering line:
```tsx
<MangaCard key={manga.id} manga={manga} />
```

Wrap it in a Link:
```tsx
<Link
  key={manga.id}
  to="/_app/manga/$id"
  params={{ id: String(manga.id) }}
>
  <MangaCard manga={manga} />
</Link>
```

Remove the `key` prop from the old `<MangaCard>` since the `<Link>` now carries the key.

- [ ] **Step 3: Build to verify**

```bash
cd frontend && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/_app/index.tsx
git commit -m "feat: link MangaCard to public manga detail page"
```

---

### Task 5: Run backend tests to verify nothing is broken

**Related Skills:** `verification-before-completion`

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && npx jest --no-coverage 2>&1 | tail -5
```

Expected: All 260+ tests pass.

- [ ] **Step 2: Run all frontend tests (if any exist)**

```bash
cd frontend && npm run test 2>&1 | tail -5
```

Expected: No failures.
