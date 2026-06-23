# Manga Table Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add author and genre filtering to the admin manga list page, with comma-separated query params, OR logic within groups, AND between groups.

**Architecture:** Backend adds `authors` and `genres` comma-separated query params to `GET /mangas`, splits on comma, builds ILIKE joins in the repository. Frontend adds a filter bar to the admin page with URL search param sync via TanStack Router.

**Tech Stack:** NestJS, TypeORM, TanStack Router, React, TanStack Query

**Related skills:** `nestjs-best-practices`, `tanstack-router-best-practices`, `tanstack-query-best-practices`, `verification-before-completion`

---

### Task 1: Update MangaRepository with author/genre filter params

**Files:**
- Modify: `backend/src/modules/manga/repositories/manga.repository.ts`
- Test: `backend/src/modules/manga/repositories/manga.repository.spec.ts` (if findAll tests exist)

**Related skills:** `nestjs-best-practices`

- [ ] **Step 1: Add `authors` and `genres` params to `findAll`**

Edit `backend/src/modules/manga/repositories/manga.repository.ts`. Change the `findAll` method signature and body:

```typescript
  findAll = async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
    authors?: string[],
    genres?: string[],
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
          OR LOWER(COALESCE(ARRAY_TO_STRING(manga.alternativeTitles, ' '), '')) LIKE LOWER(:search)
          OR LOWER(author.name) LIKE LOWER(:search)
          OR LOWER(genre.name) LIKE LOWER(:search))`,
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('manga.status = :status', { status });
    }

    if (authors && authors.length > 0) {
      const authorConditions = authors.map(
        (_, i) => `LOWER(author.name) LIKE LOWER(:author_${i})`,
      );
      const authorParams = authors.reduce(
        (acc, name, i) => ({ ...acc, [`author_${i}`]: `%${name}%` }),
        {} as Record<string, string>,
      );
      query.andWhere(`(${authorConditions.join(' OR ')})`, authorParams);
    }

    if (genres && genres.length > 0) {
      const genreConditions = genres.map(
        (_, i) => `LOWER(genre.name) LIKE LOWER(:genre_${i})`,
      );
      const genreParams = genres.reduce(
        (acc, name, i) => ({ ...acc, [`genre_${i}`]: `%${name}%` }),
        {} as Record<string, string>,
      );
      query.andWhere(`(${genreConditions.join(' OR ')})`, genreParams);
    }

    query
      .orderBy('manga.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  };
```

- [ ] **Step 2: Run existing tests to confirm no regressions**

Run: `cd backend && npx jest src/modules/manga/repositories/manga.repository.spec.ts --no-coverage 2>&1`
Expected: All tests pass

- [ ] **Step 3: Build**

Run: `cd backend && npm run build 2>&1`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/manga/repositories/manga.repository.ts
git commit -m "feat: add authors/genres filter params to MangaRepository.findAll"
```

---

### Task 2: Forward filter params through MangaService

**Files:**
- Modify: `backend/src/modules/manga/services/manga.service.ts`

**Related skills:** `nestjs-best-practices`

- [ ] **Step 1: Update `findAll` signature**

Edit `backend/src/modules/manga/services/manga.service.ts`. Change the `findAll` method:

```typescript
  findAll = async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string,
    authors?: string[],
    genres?: string[],
  ): Promise<{
    data: Manga[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    return await this.mangaRepository.findAll(
      page, limit, search, status, authors, genres,
    );
  };
```

- [ ] **Step 2: Build**

Run: `cd backend && npm run build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/manga/services/manga.service.ts
git commit -m "feat: forward authors/genres filter params in MangaService"
```

---

### Task 3: Accept filter query params in MangaController

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`

**Related skills:** `nestjs-best-practices`

- [ ] **Step 1: Add `@Query('authors')` and `@Query('genres')` params**

Edit `backend/src/modules/manga/manga.controller.ts`. Update the `findAll` handler:

```typescript
  @Get()
  @ApiOperation({ summary: 'List all mangas' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'authors', required: false, description: 'Comma-separated author names' })
  @ApiQuery({ name: 'genres', required: false, description: 'Comma-separated genre names' })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('authors') authors?: string,
    @Query('genres') genres?: string,
  ) {
    return this.mangaService.findAll(
      parseInt(page),
      parseInt(limit),
      search,
      status,
      authors ? authors.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      genres ? genres.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    );
  }
```

- [ ] **Step 2: Build**

Run: `cd backend && npm run build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts
git commit -m "feat: accept authors and genres query params in manga list endpoint"
```

---

### Task 4: Update frontend API and hooks

**Files:**
- Modify: `frontend/src/services/api/mangaApi.ts`
- Modify: `frontend/src/hooks/useManga.ts`

**Related skills:** `tanstack-query-best-practices`

- [ ] **Step 1: Add `authors`/`genres` to `getAllMangas` params**

Edit `frontend/src/services/api/mangaApi.ts`. Update the type and function:

```typescript
export async function getAllMangas(params: {
  page: number
  limit: number
  search?: string
  status?: string
  authors?: string
  genres?: string
}): Promise<PaginatedResponse<MangaResponse>> {
  const queryParams: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.search) queryParams.search = params.search
  if (params.status) queryParams.status = params.status
  if (params.authors) queryParams.authors = params.authors
  if (params.genres) queryParams.genres = params.genres

  const res = await axiosInstance.get<PaginatedResponse<MangaResponse>>(
    '/mangas',
    { params: queryParams },
  )
  return res.data
}
```

- [ ] **Step 2: Update `useMangaList` hook**

Edit `frontend/src/hooks/useManga.ts`. Update the function:

```typescript
export function useMangaList(params: {
  page: number
  limit: number
  search?: string
  status?: string
  authors?: string
  genres?: string
}) {
  return useQuery<PaginatedResponse<MangaResponse>>({
    queryKey: mangaKeys.list(params),
    queryFn: () => getAllMangas(params),
  })
}
```

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build 2>&1`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/services/api/mangaApi.ts frontend/src/hooks/useManga.ts
git commit -m "feat: add authors/genres filter params to frontend API and hooks"
```

---

### Task 5: Add filter bar to admin manga page

**Files:**
- Modify: `frontend/src/routes/admin/mangas/index.tsx`

**Related skills:** `tanstack-router-best-practices`, `tanstack-query-best-practices`, `frontend-design`

- [ ] **Step 1: Add URL search validation and filter bar**

Edit `frontend/src/routes/admin/mangas/index.tsx`. Replace the entire file content:

```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMangaList } from '#/hooks/useManga'
import type { MangaResponse } from '#/services/api/mangaApi'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import {
  ErrorDisplay,
  ErrorTitle,
  ErrorDescription,
} from '#/components/ui/error-display'
import { useState, useCallback, useEffect, useRef } from 'react'
import { BookOpenText, Plus, Upload, X } from 'lucide-react'
import { ImportDialog } from '#/components/manga/ImportDialog'
import { Pagination } from '#/components/ui/pagination'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { formatDateTime } from '#/lib/dateTimeFormatter'
import ActionsCell from '#/components/manga/ActionCell'
import { getStatusVariant } from '#/lib/mangaUtils'

const columnHelper = createColumnHelper<MangaResponse>()

const columns = [
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => {
      const variant = getStatusVariant(info.getValue())
      return (
        <Badge variant={variant} className="capitalize">
          {info.getValue()}
        </Badge>
      )
    },
  }),
  columnHelper.accessor('authors', {
    header: 'Authors',
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((a) => (
          <Badge key={a.id} variant="outline" className="capitalize">
            {a.name}
          </Badge>
        ))}
      </div>
    ),
  }),
  columnHelper.accessor('genres', {
    header: 'Genres',
    cell: (info) => (
      <div className="flex flex-wrap gap-1">
        {info.getValue().map((g) => (
          <Badge key={g.id} variant="outline" className="capitalize">
            {g.name}
          </Badge>
        ))}
      </div>
    ),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Updated',
    cell: (info) => (
      <span className="text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: (info) => <ActionsCell manga={info.row.original} />,
  }),
]

const statusOptions = ['', 'ongoing', 'completed'] as const

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

interface MangaListSearch {
  search?: string
  status?: string
  authors?: string
  genres?: string
}

export const Route = createFileRoute('/admin/mangas/')({
  validateSearch: (search: Record<string, string | undefined>): MangaListSearch => ({
    search: search.search || undefined,
    status: search.status || undefined,
    authors: search.authors || undefined,
    genres: search.genres || undefined,
  }),
  component: MangaListPage,
})

function MangaListPage() {
  const navigate = useNavigate()
  const { search, status, authors, genres } = Route.useSearch()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [importOpen, setImportOpen] = useState(false)

  const [searchInput, setSearchInput] = useState(search ?? '')
  const [authorsInput, setAuthorsInput] = useState(authors ?? '')
  const [genresInput, setGenresInput] = useState(genres ?? '')
  const [statusInput, setStatusInput] = useState(status ?? '')

  const debouncedSearch = useDebounce(searchInput, 300)
  const debouncedAuthors = useDebounce(authorsInput, 300)
  const debouncedGenres = useDebounce(genresInput, 300)

  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(1)
    navigate({
      to: '/admin/mangas',
      search: {
        search: debouncedSearch || undefined,
        authors: debouncedAuthors || undefined,
        genres: debouncedGenres || undefined,
        status: statusInput || undefined,
      },
    })
  }, [debouncedSearch, debouncedAuthors, debouncedGenres, statusInput, navigate])

  const { data, isLoading, isError } = useMangaList({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: statusInput || undefined,
    authors: debouncedAuthors || undefined,
    genres: debouncedGenres || undefined,
  })

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setAuthorsInput('')
    setGenresInput('')
    setStatusInput('')
    setPage(1)
    navigate({ to: '/admin/mangas', search: {} })
  }, [navigate])

  const hasFilters = searchInput || authorsInput || genresInput || statusInput

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Mangas</h1>
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorDisplay className="mt-6">
        <ErrorTitle>Failed to Load Mangas</ErrorTitle>
        <ErrorDescription>Make sure the backend is running.</ErrorDescription>
      </ErrorDisplay>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mangas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button asChild>
            <Link to="/admin/mangas/new" className="no-underline">
              <Plus className="h-4 w-4" />
              Create New
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search title..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Input
          placeholder="Authors (comma-separated)"
          value={authorsInput}
          onChange={(e) => setAuthorsInput(e.target.value)}
        />
        <Input
          placeholder="Genres (comma-separated)"
          value={genresInput}
          onChange={(e) => setGenresInput(e.target.value)}
        />
        <Select value={statusInput} onValueChange={setStatusInput}>
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {!data?.data.length && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>No Mangas Found</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? 'No mangas match the current filters.'
                : 'No mangas available at the moment.'}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/admin/mangas/new" className="no-underline">
                <Plus className="h-4 w-4" />
                Create New
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {data && data.data.length > 0 && (
        <div className="mt-6">
          <Table className="border">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-base font-semibold text-muted-foreground"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: '/admin/mangas/$id',
                      params: { id: String(row.original.id) },
                    })
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={(e) => {
                        if (cell.column.id === 'actions') e.stopPropagation()
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalItems={data.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build 2>&1`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/admin/mangas/index.tsx
git commit -m "feat: add filter bar with URL sync to admin manga list page"
```

---

### Task 6: Update backend tests

**Files:**
- Modify: `backend/src/modules/manga/services/manga.service.spec.ts`

**Related skills:** `nestjs-testing`, `verification-before-completion`

- [ ] **Step 1: Update existing findAll test expectations**

Read `backend/src/modules/manga/services/manga.service.spec.ts`. Find the `findAll` describe block.

Update the existing test expectations to include the new params. For the test "should return paginated mangas when page and limit provided", change the assertion:

```typescript
expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
  1, 20, undefined, undefined, undefined, undefined,
);
```

For the test "should forward search and status to repository", change:

```typescript
expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
  1, 20, 'naruto', 'ongoing', undefined, undefined,
);
```

- [ ] **Step 2: Add new test cases for author/genre filtering**

Add after the existing "should forward search and status" test:

```typescript
  it('should forward authors filter to repository', async () => {
    const paginatedResult = {
      data: [{ id: 1, title: 'Naruto' } as Manga],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

    const result = await service.findAll(1, 20, undefined, undefined, ['oda', 'miura']);

    expect(result).toEqual(paginatedResult);
    expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
      1, 20, undefined, undefined, ['oda', 'miura'], undefined,
    );
  });

  it('should forward genres filter to repository', async () => {
    const paginatedResult = {
      data: [{ id: 1, title: 'Naruto' } as Manga],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

    const result = await service.findAll(1, 20, undefined, undefined, undefined, ['action', 'adventure']);

    expect(result).toEqual(paginatedResult);
    expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
      1, 20, undefined, undefined, undefined, ['action', 'adventure'],
    );
  });
```

- [ ] **Step 3: Run tests**

Run: `cd backend && npx jest src/modules/manga/services/manga.service.spec.ts --no-coverage 2>&1`
Expected: All tests pass (including the updated and new ones)

- [ ] **Step 4: Run full test suite**

Run: `cd backend && npm run test 2>&1`
Expected: All suites pass

- [ ] **Step 5: Build**

Run: `cd backend && npm run build 2>&1`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/manga/services/manga.service.spec.ts
git commit -m "test: update tests for authors/genres filter params"
```
