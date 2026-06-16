# MR45 — Public Library Search & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add title search and status filter to the public library manga grid.

**Architecture:** Backend `GET /mangas` adds optional `search` and `status` query params. The repository uses `createQueryBuilder` with LEFT JOINs and PostgreSQL `ARRAY_TO_STRING` to search across title, alternativeTitles, description, authors.name, and genres.name. Frontend adds a `LibraryFilterBar` component with debounced search input and status dropdown, wired via React state in the library page. Filter changes reset pagination to page 1.

**Tech Stack:** NestJS (backend), TypeORM (PostgreSQL), TanStack Query (frontend data fetching), shadcn Select + Badge (filter UI)

---

### Task 1: Backend — add search + status to manga repository

**Related Skills:** `nestjs-best-practices`, `nestjs-testing`, `verification-before-completion`

**Files:**
- Modify: `backend/src/modules/manga/repositories/manga.repository.ts`
- Test: `backend/src/modules/manga/repositories/manga.repository.spec.ts`

- [ ] **Step 1: Write the failing test for filtered findAll**

Append to `manga.repository.spec.ts` inside `describe('MangaRepository')`:

```ts
describe('findAll with filters', () => {
  it('should filter by search term across title, description, authors, and genres', async () => {
    const mockData = [{ id: 1, title: 'Naruto' }] as Manga[]
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockData, 1]),
    }
    const repoWithQB = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      preload: jest.fn(),
      delete: jest.fn(),
    }
    const repo = new MangaRepository(repoWithQB as unknown as Repository<Manga>)

    const result = await repo.findAll(1, 20, 'naruto')

    expect(repoWithQB.createQueryBuilder).toHaveBeenCalledWith('manga')
    expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(2)
    expect(mockQueryBuilder.andWhere).toHaveBeenCalled()
    expect(mockQueryBuilder.getManyAndCount).toHaveBeenCalled()
    expect(result.data).toEqual(mockData)
    expect(result.total).toBe(1)
  })

  it('should filter by status', async () => {
    const mockData = [{ id: 2, title: 'One Piece', status: 'ongoing' }] as Manga[]
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([mockData, 1]),
    }
    const repoWithQB = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      preload: jest.fn(),
      delete: jest.fn(),
    }
    const repo = new MangaRepository(repoWithQB as unknown as Repository<Manga>)

    const result = await repo.findAll(1, 20, undefined, 'ongoing')

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'manga.status = :status',
      { status: 'ongoing' },
    )
    expect(result.data).toEqual(mockData)
  })

  it('should combine search and status filters', async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    }
    const repoWithQB = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
      preload: jest.fn(),
      delete: jest.fn(),
    }
    const repo = new MangaRepository(repoWithQB as unknown as Repository<Manga>)

    await repo.findAll(1, 20, 'naruto', 'completed')

    expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/manga/repositories/manga.repository.spec.ts --no-coverage 2>&1 | Select-Object -Last 10
```

Expected: ~3 failing tests, `findAll` still has old signature (no search/status params).

- [ ] **Step 3: Implement filtered findAll in repository**

Replace the current `findAll` in `manga.repository.ts`:

```ts
findAll = async (
  page: number,
  limit: number,
  search?: string,
  status?: string,
): Promise<{
  data: Manga[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const query = this.repo
    .createQueryBuilder('manga')
    .leftJoinAndSelect('manga.authors', 'author')
    .leftJoinAndSelect('manga.genres', 'genre');

  if (search) {
    query.andWhere(
      `(LOWER(manga.title) LIKE LOWER(:search)
        OR LOWER(manga.description) LIKE LOWER(:search)
        OR LOWER(ARRAY_TO_STRING(manga.alternativeTitles, ' ')) LIKE LOWER(:search)
        OR LOWER(author.name) LIKE LOWER(:search)
        OR LOWER(genre.name) LIKE LOWER(:search))`,
      { search: `%${search}%` },
    );
  }

  if (status) {
    query.andWhere('manga.status = :status', { status });
  }

  query
    .orderBy('manga.createdAt', 'DESC')
    .skip((page - 1) * limit)
    .take(limit);

  const [data, total] = await query.getManyAndCount();

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/manga/repositories/manga.repository.spec.ts --no-coverage 2>&1 | Select-Object -Last 10
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/manga/repositories/manga.repository.ts backend/src/modules/manga/repositories/manga.repository.spec.ts
git commit -m "feat: add search and status filtering to manga repository"
```

---

### Task 2: Backend — update service to pass through filter params

**Related Skills:** `nestjs-best-practices`, `nestjs-testing`, `verification-before-completion`

**Files:**
- Modify: `backend/src/modules/manga/services/manga.service.ts`
- Test: `backend/src/modules/manga/services/manga.service.spec.ts`

- [ ] **Step 1: Update service.findAll signature**

In `manga.service.ts`:

```ts
findAll = async (
  page: number = 1,
  limit: number = 20,
  search?: string,
  status?: string,
): Promise<...> => {
  return await this.mangaRepository.findAll(page, limit, search, status);
};
```

- [ ] **Step 2: Update service test**

In `manga.service.spec.ts`, find the existing `findAll` test and add a second test:

```ts
it('should forward search and status to repository', async () => {
  const paginatedResult = {
    data: [{ id: 1, title: 'Naruto' } as Manga],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };
  mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

  const result = await service.findAll(1, 20, 'naruto', 'ongoing');

  expect(result).toEqual(paginatedResult);
  expect(mockMangaRepository.findAll).toHaveBeenCalledWith(1, 20, 'naruto', 'ongoing');
});
```

- [ ] **Step 3: Run tests to verify**

```bash
cd backend && npx jest src/modules/manga/services/manga.service.spec.ts --no-coverage 2>&1 | Select-Object -Last 10
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/services/manga.service.ts backend/src/modules/manga/services/manga.service.spec.ts
git commit -m "feat: forward search and status params in manga service"
```

---

### Task 3: Backend — add search + status query params to controller

**Related Skills:** `nestjs-best-practices`, `nestjs-testing`, `verification-before-completion`

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Test: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Step 1: Update controller findAll handler**

In `manga.controller.ts`, add `@Query('search') search?: string` and `@Query('status') status?: string`:

```ts
@Get()
findAll(
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '20',
  @Query('search') search?: string,
  @Query('status') status?: string,
) {
  return this.mangaService.findAll(parseInt(page), parseInt(limit), search, status);
}
```

- [ ] **Step 2: Update controller test**

In `manga.controller.spec.ts`, find the `findAll` test and add a test for the new params:

```ts
it('should pass search and status query params to service', async () => {
  const result = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  mockMangaService.findAll.mockResolvedValue(result);

  await controller.findAll('1', '20', 'naruto', 'ongoing');

  expect(mockMangaService.findAll).toHaveBeenCalledWith(1, 20, 'naruto', 'ongoing');
});
```

- [ ] **Step 3: Run tests to verify**

```bash
cd backend && npx jest src/modules/manga/manga.controller.spec.ts --no-coverage 2>&1 | Select-Object -Last 10
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts backend/src/modules/manga/manga.controller.spec.ts
git commit -m "feat: add search and status query params to GET /mangas"
```

---

### Task 4: Frontend — update getAllMangas to use object param

**Related Skills:** `verification-before-completion`

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`

- [ ] **Step 1: Update getAllMangas signature**

Change from positional to object param:

```ts
export async function getAllMangas(params: {
  page: number
  limit: number
  search?: string
  status?: string
}): Promise<PaginatedResponse<MangaResponse>> {
  const queryParams: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.search) queryParams.search = params.search
  if (params.status) queryParams.status = params.status

  const res = await axiosInstance.get<PaginatedResponse<MangaResponse>>(
    '/mangas',
    { params: queryParams },
  )
  return res.data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/api/mangaApi.ts
git commit -m "feat: getAllMangas accepts object params with search and status"
```

---

### Task 5: Frontend — update useMangaList hook

**Related Skills:** `tanstack-query-best-practices`, `verification-before-completion`

**Files:**
- Modify: `frontend/src/hooks/useManga.ts`

- [ ] **Step 1: Update useMangaList to accept object param with search/status**

```ts
const mangaKeys = {
  all: ['mangas'] as const,
  list: (params: { page: number; limit: number; search?: string; status?: string }) =>
    [...mangaKeys.all, 'list', params.page, params.limit, params.search, params.status] as const,
  detail: (id: number) => [...mangaKeys.all, 'detail', id] as const,
}

export function useMangaList(params: {
  page: number
  limit: number
  search?: string
  status?: string
}) {
  return useQuery<PaginatedResponse<MangaResponse>>({
    queryKey: mangaKeys.list(params),
    queryFn: () => getAllMangas(params),
  })
}
```

- [ ] **Step 2: Check and fix all callers of useMangaList**

Search for `useMangaList(` across the frontend and update any callers to use object syntax. Currently only `_app/index.tsx` calls it with `(page, pageSize)`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useManga.ts
git commit -m "feat: useMangaList accepts object param with search and status"
```

---

### Task 6: Frontend — create LibraryFilterBar component

**Related Skills:** `frontend-design`, `verification-before-completion`

**Files:**
- Create: `frontend/src/components/library/LibraryFilterBar.tsx`

- [ ] **Step 1: Create the LibraryFilterBar component**

```tsx
import { Search, X } from 'lucide-react'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'

interface LibraryFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
}

const statusOptions = [
  { value: '', label: 'All' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
]

export function LibraryFilterBar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: LibraryFilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1 capitalize">
            {statusOptions.find((o) => o.value === status)?.label ?? status}
            <button
              type="button"
              onClick={() => onStatusChange('')}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
            >
              <X className="size-3" />
            </button>
          </Badge>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
mkdir -p frontend/src/components/library
git add frontend/src/components/library/LibraryFilterBar.tsx
git commit -m "feat: add LibraryFilterBar component with search and status filter"
```

---

### Task 7: Frontend — wire filters into library page

**Related Skills:** `tanstack-query-best-practices`, `verification-before-completion`

**Files:**
- Modify: `frontend/src/routes/_app/index.tsx`

- [ ] **Step 1: Add search/status state, debounce, and filter bar**

Update `_app/index.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
import { MangaCard } from '#/components/manga/MangaCard'
import { LibraryFilterBar } from '#/components/library/LibraryFilterBar'
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

export const Route = createFileRoute('/_app/')({
  component: LibraryPage,
})

function LibraryPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const { data, isLoading, isError, refetch } = useMangaList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
  })

  if (isLoading) {
    return (
      <div>
        <div className="mb-6">
          <LibraryFilterBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border">
              <Skeleton className="aspect-3/4 rounded-t-lg" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <div className="mb-6">
          <LibraryFilterBar
            search={search}
            onSearchChange={setSearch}
            status={status}
            onStatusChange={setStatus}
          />
        </div>
        <ErrorDisplay>
          <ErrorTitle>Failed to Load Library</ErrorTitle>
          <ErrorDescription>
            Could not fetch manga list. The backend may be unavailable.
          </ErrorDescription>
          <Button onClick={() => refetch()}>Retry</Button>
        </ErrorDisplay>
      </div>
    )
  }

  const hasFilters = !!debouncedSearch || !!status
  const isEmpty = !data || data.data.length === 0

  if (isEmpty && !hasFilters) {
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
      <div className="mb-6">
        <LibraryFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />
      </div>

      {isEmpty && hasFilters ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No mangas match your filters</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
            {data!.data.map((manga: MangaResponse) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>

          <Pagination
            page={data!.page}
            totalPages={data!.totalPages}
            totalItems={data!.total}
            pageSize={data!.limit}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify**

```bash
cd frontend && npm run build 2>&1 | Select-Object -Last 5
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/_app/index.tsx
git commit -m "feat: wire search and status filters into library page"
```
