# MR40: Manga Detail Admin Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a manga detail admin page at `/admin/mangas/{id}` showing metadata, chapters, and per-chapter translations via expandable rows.

**Architecture:** Extend `GET /mangas/:id` with `?include=chapters,translations` query param. Backend creates `MangaResponse` + `MangaDetailResponse extends MangaResponse` DTOs. Frontend adds new route following admin page patterns (Skeleton/ErrorDisplay/Empty states), updates API types/hooks, and adds row-click navigation from the list page.

**Tech Stack:** NestJS + TypeORM, TanStack Router + React + shadcn

---

### Task 1: Backend Response DTOs

**Skills:** `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/manga/dto/manga-response.dto.ts`
- Test: N/A (pure data classes, no logic to test)

- [ ] **Step 1: Create manga-response.dto.ts**

```typescript
// backend/src/modules/manga/dto/manga-response.dto.ts

export class AuthorRef {
  id: number;
  name: string;
}

export class GenreRef {
  id: number;
  name: string;
}

export class MangaResponse {
  id: number;
  title: string;
  alternativeTitles?: string[];
  description?: string;
  coverPath?: string;
  status: string;
  authors: AuthorRef[];
  genres: GenreRef[];
  createdAt: string;
  updatedAt: string;
}

export class ChapterTranslationResponse {
  id: number;
  folderPath: string;
  note?: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
}

export class ChapterDetailResponse {
  id: number;
  number: number;
  title?: string;
  releaseDate?: string;
  note?: string;
  translations: ChapterTranslationResponse[];
}

export class MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetailResponse[];
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/manga/dto/manga-response.dto.ts
git commit -m "feat(backend): add MangaResponse and MangaDetailResponse DTOs"
```

---

### Task 2: Repository — optional includeDetail flag

**Skills:** `nestjs-testing`, `test-driven-development`

**Files:**
- Modify: `backend/src/modules/manga/manga.repository.ts`
- Test: `backend/src/modules/manga/manga.repository.spec.ts`

- [ ] **Step 1: Read existing repository**

Read `backend/src/modules/manga/manga.repository.ts` to understand current `findOneByIdWithRelations`.

- [ ] **Step 2: Write failing test for includeDetail**

Read `backend/src/modules/manga/manga.repository.spec.ts` first to follow its patterns, then add a test case inside the existing `describe('findOneByIdWithRelations')` block:

```typescript
describe('findOneByIdWithRelations', () => {
  // ... existing tests ...

  it('should load chapters and translations when includeDetail is true', async () => {
    const mockManga = { id: 1, title: 'Test', authors: [], genres: [], chapters: [{ id: 1, number: 1, translations: [{ id: 1, folderPath: '/path', language: { id: 1, code: 'en', name: 'English' }, translator: { id: 1, name: 'T1' } }] }] };

    jest.spyOn(repo, 'findOne').mockResolvedValue(mockManga as any);

    const result = await repository.findOneByIdWithRelations(1, true);

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['authors', 'genres', 'chapters', 'chapters.translations'],
    });
    expect(result).toEqual(mockManga);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/modules/manga/manga.repository.spec.ts --no-coverage -t "includeDetail" -v`

Expected: FAIL — method doesn't accept a second parameter yet.

- [ ] **Step 4: Modify repository**

In `manga.repository.ts`, change:

```typescript
findOneByIdWithRelations = async (id: number): Promise<Manga | null> => {
  return await this.repo.findOne({
    where: { id },
    relations: ['authors', 'genres'],
  });
};
```

To:

```typescript
findOneByIdWithRelations = async (id: number, includeDetail?: boolean): Promise<Manga | null> => {
  const relations: string[] = ['authors', 'genres'];
  if (includeDetail) {
    relations.push('chapters', 'chapters.translations');
  }
  return await this.repo.findOne({
    where: { id },
    relations,
  });
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/modules/manga/manga.repository.spec.ts --no-coverage -t "includeDetail" -v`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/manga/manga.repository.ts backend/src/modules/manga/manga.repository.spec.ts
git commit -m "feat(backend): add includeDetail option to findOneByIdWithRelations"
```

---

### Task 3: Service — include param + mapper

**Skills:** `nestjs-testing`, `test-driven-development`

**Files:**
- Modify: `backend/src/modules/manga/manga.service.ts`
- Test: `backend/src/modules/manga/manga.service.spec.ts`

- [ ] **Step 1: Read existing service + spec**

Read `backend/src/modules/manga/manga.service.ts` and `backend/src/modules/manga/manga.service.spec.ts`.

- [ ] **Step 2: Write failing tests**

In `manga.service.spec.ts`, add inside the existing `findOne` describe block (follow the file's pattern for mocks/spies):

```typescript
describe('findOne', () => {
  // ... existing test for basic findOne ...

  it('should return MangaDetailResponse when include=chapters,translations', async () => {
    const mockManga = {
      id: 1,
      title: 'Test',
      alternativeTitles: [],
      description: 'Desc',
      coverPath: null,
      status: 'ongoing',
      authors: [{ id: 1, name: 'Author1' }],
      genres: [{ id: 1, name: 'Genre1' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      chapters: [{
        id: 1,
        number: 1,
        title: 'Ch1',
        releaseDate: '2024-01-01',
        note: null,
        translations: [{
          id: 1,
          folderPath: '/path',
          note: null,
          language: { id: 1, code: 'en', name: 'English' },
          translator: { id: 1, name: 'T1' },
        }],
      }],
    };

    jest.spyOn(repository, 'findOneByIdWithRelations').mockResolvedValue(mockManga as any);

    const result = await service.findOne(1, 'chapters,translations');

    expect(repository.findOneByIdWithRelations).toHaveBeenCalledWith(1, true);
    expect(result).toHaveProperty('chapters');
    expect((result as any).chapters).toHaveLength(1);
    expect((result as any).chapters[0].translations).toHaveLength(1);
  });

  it('should return MangaResponse without chapters when no include param', async () => {
    const mockManga = {
      id: 1,
      title: 'Test',
      alternativeTitles: [],
      description: 'Desc',
      coverPath: null,
      status: 'ongoing',
      authors: [{ id: 1, name: 'Author1' }],
      genres: [{ id: 1, name: 'Genre1' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    jest.spyOn(repository, 'findOneByIdWithRelations').mockResolvedValue(mockManga as any);

    const result = await service.findOne(1);

    expect(repository.findOneByIdWithRelations).toHaveBeenCalledWith(1, undefined);
    expect(result).not.toHaveProperty('chapters');
  });

  it('should return null when manga not found with include param', async () => {
    jest.spyOn(repository, 'findOneByIdWithRelations').mockResolvedValue(null);

    const result = await service.findOne(999, 'chapters,translations');

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/modules/manga/manga.service.spec.ts --no-coverage -t "include" -v`

Expected: FAIL — service doesn't accept second param yet.

- [ ] **Step 4: Implement service changes**

In `manga.service.ts`, update `findOne`:

```typescript
async findOne(id: number, include?: string): Promise<MangaResponse | MangaDetailResponse> {
  const includeDetail = include === 'chapters,translations';
  const manga = await this.mangaRepository.findOneByIdWithRelations(id, includeDetail);

  if (!manga) {
    return null;
  }

  const base: MangaResponse = {
    id: manga.id,
    title: manga.title,
    alternativeTitles: manga.alternativeTitles ?? undefined,
    description: manga.description ?? undefined,
    coverPath: manga.coverPath ?? undefined,
    status: manga.status,
    authors: manga.authors.map((a) => ({ id: a.id, name: a.name })),
    genres: manga.genres.map((g) => ({ id: g.id, name: g.name })),
    createdAt: manga.createdAt.toISOString(),
    updatedAt: manga.updatedAt.toISOString(),
  };

  if (!includeDetail) {
    return base;
  }

  return {
    ...base,
    chapters: manga.chapters?.map((ch) => ({
      id: ch.id,
      number: ch.number,
      title: ch.title ?? undefined,
      releaseDate: ch.releaseDate ? new Date(ch.releaseDate).toISOString().split('T')[0] : undefined,
      note: ch.note ?? undefined,
      translations: ch.translations?.map((tr) => ({
        id: tr.id,
        folderPath: tr.folderPath,
        note: tr.note ?? undefined,
        language: { id: tr.language.id, code: tr.language.code, name: tr.language.name },
        translator: { id: tr.translator.id, name: tr.translator.name },
      })) ?? [],
    })) ?? [],
  };
}
```

Also update the imports at the top:

```typescript
import { MangaResponse, MangaDetailResponse } from './dto/manga-response.dto';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/modules/manga/manga.service.spec.ts --no-coverage`

Expected: All tests PASS (including existing + new).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/manga/manga.service.ts backend/src/modules/manga/manga.service.spec.ts
git commit -m "feat(backend): add include param to manga findOne, map to response DTOs"
```

---

### Task 4: Controller — @Query include param

**Skills:** `nestjs-testing`, `test-driven-development`

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Test: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Step 1: Read existing controller + spec**

Read `backend/src/modules/manga/manga.controller.ts` and `backend/src/modules/manga/manga.controller.spec.ts`.

- [ ] **Step 2: Write failing tests**

In `manga.controller.spec.ts`, add inside the `findOne` describe block:

```typescript
it('should pass include query param to service', async () => {
  const mockResponse = { id: 1, title: 'Test', chapters: [] };
  jest.spyOn(service, 'findOne').mockResolvedValue(mockResponse as any);

  const result = await controller.findOne('1', 'chapters,translations');

  expect(service.findOne).toHaveBeenCalledWith(1, 'chapters,translations');
  expect(result).toEqual(mockResponse);
});

it('should call findOne without include when no query param', async () => {
  const mockResponse = { id: 1, title: 'Test' };
  jest.spyOn(service, 'findOne').mockResolvedValue(mockResponse as any);

  const result = await controller.findOne('1');

  expect(service.findOne).toHaveBeenCalledWith(1, undefined);
  expect(result).toEqual(mockResponse);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest src/modules/manga/manga.controller.spec.ts --no-coverage -t "include" -v`

Expected: FAIL — controller doesn't accept second param.

- [ ] **Step 4: Update controller**

In `manga.controller.ts`, change:

```typescript
@Get(':id')
findOne(@Param('id') id: string) {
  return this.mangaService.findOne(+id);
}
```

To:

```typescript
@Get(':id')
findOne(
  @Param('id') id: string,
  @Query('include') include?: string,
) {
  return this.mangaService.findOne(+id, include);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/modules/manga/manga.controller.spec.ts --no-coverage`

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts backend/src/modules/manga/manga.controller.spec.ts
git commit -m "feat(backend): add @Query include param to GET /mangas/:id"
```

---

### Task 5: Frontend — types, API function, hook

**Skills:** `tanstack-query-best-practices`, `vercel-react-best-practices`

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`
- Modify: `frontend/src/hooks/useManga.ts`

- [ ] **Step 1: Read existing files**

Read `frontend/src/services/api/mangaApi.ts` and `frontend/src/hooks/useManga.ts`.

- [ ] **Step 2: Update mangaApi.ts**

Add new interfaces after `MangaResponse`:

```typescript
export interface TranslationDetail {
  id: number
  folderPath: string
  note?: string
  language: { id: number; code: string; name: string }
  translator: { id: number; name: string }
}

export interface ChapterDetail {
  id: number
  number: number
  title?: string
  releaseDate?: string
  note?: string
  translations: TranslationDetail[]
}

export interface MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetail[]
}
```

Update `getManga` function signature:

```typescript
export const getManga = async (
  id: number,
  include?: string,
): Promise<MangaResponse | MangaDetailResponse> => {
  const params = include ? `?include=${include}` : ''
  const response = await api.get<MangaResponse | MangaDetailResponse>(
    `/mangas/${id}${params}`,
  )
  return response.data
}
```

- [ ] **Step 3: Update useManga.ts**

Change the hook to accept optional options parameter:

```typescript
export const useManga = (
  id: number,
  options?: { include?: string },
) => {
  return useQuery({
    queryKey: options?.include
      ? ['mangas', 'detail', id, options.include]
      : ['mangas', 'detail', id],
    queryFn: () => getManga(id, options?.include),
    enabled: !!id,
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd frontend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api/mangaApi.ts frontend/src/hooks/useManga.ts
git commit -m "feat(frontend): add MangaDetailResponse types, update getManga and useManga hooks"
```

---

### Task 6: Frontend — manga detail page route

**Skills:** `frontend-design`, `shadcn`, `tanstack-router-best-practices`

**Files:**
- Create: `frontend/src/routes/admin/mangas/$id.tsx`
- Modify: `frontend/src/routeTree.gen.ts` (auto-generated later)

- [ ] **Step 1: Create detail page**

Create `frontend/src/routes/admin/mangas/$id.tsx`:

```typescript
import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router'
import { useManga } from '../../../hooks/useManga'
import { type MangaDetailResponse } from '../../../services/api/mangaApi'
import { Skeleton } from '../../../components/ui/skeleton'
import { ErrorDisplay, ErrorTitle, ErrorDescription } from '../../../components/ui/error-display'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyContent } from '../../../components/ui/empty'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../../../components/ui/table'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../../../components/ui/collapsible'
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  Pencil,
  ArrowLeft,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/admin/mangas/$id')({
  component: MangaDetailPage,
})

function MangaDetailPage() {
  const { id } = useParams({ from: '/admin/mangas/$id' })
  const navigate = useNavigate()
  const mangaId = Number(id)
  const { data, isLoading, isError } = useManga(mangaId, {
    include: 'chapters,translations',
  })
  const manga = data as MangaDetailResponse | undefined

  if (isLoading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !manga) {
    return (
      <div>
        <ErrorDisplay className="mt-6">
          <ErrorTitle>Failed to Load Manga</ErrorTitle>
          <ErrorDescription>
            The manga may not exist or the backend is unavailable.
          </ErrorDescription>
        </ErrorDisplay>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/mangas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{manga.title}</h1>
          <Badge variant="outline">{manga.status}</Badge>
        </div>
        <Button onClick={() => navigate({ to: '/admin/mangas/$id/edit', params: { id } })}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Manga
        </Button>
      </div>

      <div className="mb-8 rounded-lg border p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {manga.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">Description</dt>
              <dd className="mt-1">{manga.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-muted-foreground">Alternative Titles</dt>
            <dd className="mt-1">
              {manga.alternativeTitles?.length
                ? manga.alternativeTitles.join(', ')
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Cover Path</dt>
            <dd className="mt-1 font-mono text-sm">{manga.coverPath || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Authors</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {manga.authors.map((a) => (
                <Badge key={a.id} variant="secondary">
                  {a.name}
                </Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Genres</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {manga.genres.map((g) => (
                <Badge key={g.id} variant="secondary">
                  {g.name}
                </Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Created</dt>
            <dd className="mt-1">{new Date(manga.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Updated</dt>
            <dd className="mt-1">{new Date(manga.updatedAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      <h2 className="mb-4 text-xl font-semibold">Chapters</h2>

      {manga.chapters.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No Chapters Yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => navigate({ to: '/admin/mangas/$id/edit', params: { id } })}>
              Add Chapter
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>#</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Release Date</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {manga.chapters.map((chapter) => (
              <ChapterRow key={chapter.id} chapter={chapter} mangaId={id} />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function ChapterRow({ chapter, mangaId }: { chapter: ChapterDetail; mangaId: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <>
        <TableRow>
          <TableCell>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </TableCell>
          <TableCell className="font-mono">{chapter.number}</TableCell>
          <TableCell>{chapter.title || '—'}</TableCell>
          <TableCell>{chapter.releaseDate || '—'}</TableCell>
          <TableCell className="max-w-[200px] truncate font-mono text-sm">
            {chapter.note || '—'}
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigate({ to: '/admin/mangas/$id/edit', params: { id: mangaId } })}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        <CollapsibleContent asChild>
          <TableRow>
            <TableCell colSpan={6} className="bg-muted/30 p-0">
              {chapter.translations.length === 0 ? (
                <div className="px-6 py-3 text-sm text-muted-foreground">
                  No translations for this chapter.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-10">Language</TableHead>
                      <TableHead>Translator</TableHead>
                      <TableHead>Folder Path</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapter.translations.map((tr) => (
                      <TableRow key={tr.id}>
                        <TableCell className="pl-10">{tr.language.name}</TableCell>
                        <TableCell>{tr.translator.name}</TableCell>
                        <TableCell className="font-mono text-sm">{tr.folderPath}</TableCell>
                        <TableCell>{tr.note || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      </>
    </Collapsible>
  )
}
```

Note: Import `ChapterDetail` from types if needed — it's used in the component but if not exported separately, inline the type or export it from mangaApi.ts.

- [ ] **Step 2: Export ChapterDetail from mangaApi.ts**

Ensure `ChapterDetail` is exported from `mangaApi.ts` (it should be from Task 5).

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`

Expected: Build compiles. If there are import errors for `Collapsible`, `Badge`, etc., check if they're already in the shadcn registry.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/admin/mangas/\$id.tsx
git commit -m "feat(frontend): add manga detail page route with info card and chapter table"
```

Note: Escape `$` in PowerShell with backtick or simply quote the path.

---

### Task 7: Frontend — navigation from manga list page

**Skills:** `frontend-design`, `tanstack-router-best-practices`

**Files:**
- Modify: `frontend/src/routes/admin/mangas/index.tsx`
- Possibly: `frontend/src/components/manga/ActionCell.tsx`

- [ ] **Step 1: Read the manga list page**

Read `frontend/src/routes/admin/mangas/index.tsx` and `frontend/src/components/manga/ActionCell.tsx`.

- [ ] **Step 2: Add row click + View button**

In `frontend/src/routes/admin/mangas/index.tsx`:

Add `useNavigate` import if not present.

For row click: Add `onClick` on the `<TableRow>` to navigate to the detail page:

```tsx
<TableRow
  key={manga.id}
  className="cursor-pointer"
  onClick={() => navigate({ to: '/admin/mangas/$id', params: { id: String(manga.id) } })}
>
```

In `ActionCell.tsx` (or inline in the actions column), add a "View" button alongside the existing "Edit" button:

```tsx
<Button
  variant="ghost"
  size="icon"
  className="h-8 w-8"
  onClick={(e) => {
    e.stopPropagation()
    navigate({ to: '/admin/mangas/$id', params: { id: String(manga.id) } })
  }}
>
  <Eye className="h-3 w-3" />
</Button>
```

Import `Eye` from `lucide-react` if not already available.

- [ ] **Step 3: Build check**

Run: `cd frontend && npm run build`

Expected: Build compiles.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/admin/mangas/index.tsx frontend/src/components/manga/ActionCell.tsx
git commit -m "feat(frontend): add row click and View button navigation to manga detail page"
```

---

### Task 8: Route generation + final verification

**Skills:** `verification-before-completion`

**Files:**
- Modify: `frontend/src/routeTree.gen.ts` (auto-generated)

- [ ] **Step 1: Generate routes**

Run: `cd frontend && npm run generate-routes`

Expected: Route file regenerated with `/admin/mangas/$id` included.

- [ ] **Step 2: Full backend test suite**

Run: `cd backend && npx jest --no-coverage`

Expected: All tests PASS (26+ suites).

- [ ] **Step 3: Frontend type check**

Run: `cd frontend && npm run check`

Expected: No errors (pre-existing warnings OK).

- [ ] **Step 4: Full build check**

Run: `cd backend && npm run build`

Expected: Build compiles.

- [ ] **Step 5: ESLint check on changed files**

Run: `cd backend && npx eslint src/modules/manga/`

Expected: No errors.

- [ ] **Step 6: Final commit**

```bash
git add frontend/src/routeTree.gen.ts
git commit -m "chore: regenerate route tree after adding manga detail page"
```
