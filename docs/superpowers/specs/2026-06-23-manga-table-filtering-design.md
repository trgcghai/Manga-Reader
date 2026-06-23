# Manga Table Filtering — Design Spec

## Purpose

Add filtering capabilities to the admin manga list page so admins can quickly find mangas by title, author(s), genre(s), and status.

## Backend

### API changes

Extend `GET /mangas` with two new optional query params:

| Param | Type | Example | Logic |
|-------|------|---------|-------|
| `authors` | `string` (comma-separated) | `?authors=oda,miura` | OR — any matching author |
| `genres` | `string` (comma-separated) | `?genres=action,adventure` | OR — any matching genre |

`search` (title ILIKE) and `status` remain unchanged.

All params are AND between groups. Example: `?search=one+titles&authors=oda,miura&genres=action` → title ILIKE `%one titles%` AND (author ILIKE `%oda%` OR `%miura%`) AND (genre ILIKE `%action%`).

### Implementation

`MangaController.findAll()` — add `@Query('authors') authors?: string` and `@Query('genres') genres?: string`. Split on comma to get `string[]`.

`MangaService.findAll()` — add `authors: string[]` and `genres: string[]` params, forward to repository.

`MangaRepository.findAll()` — use `createQueryBuilder` with LEFT JOINs:

```sql
SELECT manga.*
FROM manga
LEFT JOIN manga_authors ON manga.id = manga_authors.manga_id
LEFT JOIN authors ON manga_authors.author_id = authors.id
LEFT JOIN manga_genres ON manga.id = manga_genres.manga_id
LEFT JOIN genres ON manga_genres.genre_id = genres.id
WHERE (manga.title ILIKE :search)          -- if search provided
  AND (authors.name ILIKE ANY(:authors))   -- if authors provided (OR)
  AND (genres.name ILIKE ANY(:genres))     -- if genres provided (OR)
  AND (manga.status = :status)             -- if status provided
```

Use `.andWhere()` with parenthesized groups. Apply `DISTINCT` to avoid duplicates from multiple joins.

### Response

No changes — returns the existing `MangaResponse[]` paginated structure.

## Frontend

### Filter bar

Placed in `frontend/src/routes/admin/mangas/index.tsx` between the page header and the table.

Four controls in a horizontal row:

| Control | Implementation | URL param serialization |
|---------|---------------|------------------------|
| Title search | `<Input>` with 300ms debounce | `?search=` |
| Author(s) | `<Input>` with comma-separated values | `?authors=oda,miura` |
| Genre(s) | `<Input>` with comma-separated values | `?genres=action,adventure` |
| Status | `<Select>` with All/Ongoing/Completed | `?status=` |
| Clear all | `<Button>` | Resets to `/admin/mangas` |

### URL sync

Use TanStack Router's:

- `validateSearch` — parse and validate `search`, `status`, `authors?: string`, `genres?: string`
- `useSearch()` — read current filters
- `useNavigate({ search: ... })` — update filters on user interaction

### Hook changes

`useMangaList` — extend params to accept `authors` and `genres`. Forward them as query params in the API call.

### Mobile

On small screens the filter bar wraps to a 2-column grid.

### Files to modify

| File | Change |
|------|--------|
| `backend/src/modules/manga/repositories/manga.repository.ts` | Add `authors`/`genres` params to `findAll()`, build query with JOINs |
| `backend/src/modules/manga/services/manga.service.ts` | Forward new params |
| `backend/src/modules/manga/manga.controller.ts` | Accept `@Query('authors')` and `@Query('genres')` |
| `frontend/src/services/api/mangaApi.ts` | Add `authors`/`genres` to API params |
| `frontend/src/hooks/useManga.ts` | Forward new params in `useMangaList` |
| `frontend/src/routes/admin/mangas/index.tsx` | Add filter bar, URL sync |

## Testing

- Backend: extend `MangaService` unit tests for author/genre filtering
- Frontend: component test for filter bar rendering and URL param sync

## Out of scope

- Reader manga list page — admin only for this MR
- Debounce/loading indicators — handled by existing React Query patterns
