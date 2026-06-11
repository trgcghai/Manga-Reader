# MR11: Manga CRUD Create and List — Design Spec

## Overview

Build the manga creation form and list view so an admin can add new manga records and browse existing entries from the local content library. Uses a dedicated admin route prefix (`/admin`) with a shared layout, paginated list, and class-validator DTOs.

## Backend

### Dependencies to add
- `class-validator`
- `class-transformer`

### CreateMangaDto
```
title: string              — @IsString, @MinLength(1)
status: MangaStatus        — @IsEnum(MangaStatus)
description?: string       — @IsOptional, @IsString
alternativeTitles?: string[] — @IsOptional, @IsString({ each: true })
coverPath?: string         — @IsOptional, @IsString
authors?: string[]         — @IsOptional, @IsString({ each: true }) — names to resolve-or-create
genres?: string[]          — @IsOptional, @IsString({ each: true }) — names to resolve-or-create
```

### Validation
Enable `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` globally in `main.ts`.

### Repository — new methods
- `create(data: Partial<Manga>): Promise<Manga>` — delegates to `this.repo.save(data)`
- `findAllPaginated(page: number, limit: number): Promise<{ data: Manga[]; total: number }>` — uses `this.repo.findAndCount({ skip, take, relations: ['authors', 'genres'] })`

### Service — new method
- `create(dto: CreateMangaDto): Promise<Manga>`
  - For each `dto.authors` name: `findOneByName` or create-and-save a new Author
  - For each `dto.genres` name: `findOneByName` or create-and-save a new Genre
  - Build Manga entity with resolved authors/genres, save via repository
  - Return saved manga with relations loaded
- Update `findAll(page?, limit?)` to support pagination with defaults (page=1, limit=20)

### Controller — new endpoints
- `POST /mangas` — accepts `CreateMangaDto`, returns created Manga
- Update `GET /mangas` — accepts `@Query('page')` and `@Query('limit')`, returns `{ data, total, page, limit }`

### Tests
- Unit tests for `CreateMangaDto` validation
- Unit tests for `MangaService.create` (author/genre resolution, save)
- Unit tests for `MangaController.create`
- Update existing tests for paginated `findAll`

## Frontend

### Dependencies to add
- `@tanstack/react-query`

### Routing (file-based, TanStack Router)
```
src/routes/admin/__root.tsx       → admin layout with sidebar + Outlet
src/routes/admin/index.tsx        → redirect to /admin/mangas
src/routes/admin/mangas/index.tsx → paginated manga list
src/routes/admin/mangas/new.tsx   → create manga form
```

### Admin layout (`/admin`)
- Sidebar with nav links: "Mangas" (active by default)
- Top area for breadcrumb or page title
- Styled with existing design tokens (--sea-ink, --lagoon, etc.)

### Manga list page (`/admin/mangas`)
- TanStack Query: `useQuery({ queryKey: ['mangas', page], queryFn: () => fetchMangas(page, limit) })`
- Table columns: Title, Status, Authors, Genres, Created At
- Pagination bar: prev/next + page numbers
- "Add Manga" button → `useNavigate` to `/admin/mangas/new`
- Loading skeleton while fetching
- Empty state when no mangas

### Create form page (`/admin/mangas/new`)
- Fields: Title (text), Status (select), Description (textarea), Alternative Titles (tag input with add/remove), Cover Path (text), Authors (text input with add/remove list), Genres (text input with add/remove list)
- Client-side validation before submit
- TanStack Query: `useMutation({ mutationFn: (data) => postManga(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mangas'] }); navigate({ to: '/admin/mangas' }) } })`
- Error display on failure
- Cancel/back link

### API client
- Small module at `src/lib/api/mangas.ts`
- `fetchMangas(page, limit)` → `GET /api/mangas?page=&limit=`
- `createManga(data)` → `POST /api/mangas`
- Uses relative `/api` path; Vite proxy forwards to backend

### Vite proxy
Add proxy to `vite.config.ts`:
```
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001', changeOrigin: true }
  }
}
```
- In Docker: proxy still works since both containers share the same network; proxy target uses `http://backend:3001` via env var
- In dev without Docker: proxies to local NestJS on port 3001

## Data Flow
1. Admin navigates to `/admin/mangas` → list loads via `GET /api/mangas?page=1&limit=20`
2. Admin clicks "Add Manga" → navigates to `/admin/mangas/new`
3. Admin fills form, submits → `POST /api/mangas` with `CreateMangaDto`
4. Backend validates, resolves-or-creates authors/genres, saves manga
5. On success: invalidate `['mangas']` query cache, navigate back to list
6. List re-fetches with updated data, showing the new entry

## Acceptance Criteria Covered
- [x] Admin can create a manga record from the UI — create form at `/admin/mangas/new`
- [x] Admin can see all manga records in a list view — paginated list at `/admin/mangas`
- [x] Validation prevents saving incomplete manga data — class-validator DTO + client-side checks
- [x] The create flow returns the newly created manga in the list — query invalidation + navigation
