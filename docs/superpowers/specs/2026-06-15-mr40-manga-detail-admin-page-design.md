# MR40: Manga Detail Admin Page — Design Spec

## Overview

Build a manga detail admin page at `/admin/mangas/{mangaId}` showing all metadata, a chapter list, and per-chapter translations via expandable rows. The existing `GET /mangas/:id` endpoint is extended with an optional `?include=chapters,translations` query param to optionally load chapters and translations, returning a `MangaDetailResponse` DTO.

## Backend Changes

### 1. New Response DTOs

The backend currently returns entities directly (no response DTO). We create two response DTOs in a single file `backend/src/modules/manga/dto/manga-response.dto.ts`:

```typescript
class AuthorRef { id: number; name: string }
class GenreRef  { id: number; name: string }

class MangaResponse {
  id: number
  title: string
  alternativeTitles?: string[]
  description?: string
  coverPath?: string
  status: string
  authors: AuthorRef[]
  genres: GenreRef[]
  createdAt: string
  updatedAt: string
}

class TranslationDetailResponse {
  id: number
  folderPath: string
  note?: string
  language: { id: number; code: string; name: string }
  translator: { id: number; name: string }
}

class ChapterDetailResponse {
  id: number
  number: number
  title?: string
  releaseDate?: string
  note?: string
  translations: TranslationDetailResponse[]
}

class MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetailResponse[]
}
```

### 2. Repository — `MangaRepository`

Modify `findOneByIdWithRelations` to accept an optional `includeDetail` flag:

```typescript
findOneByIdWithRelations(id: number, includeDetail?: boolean): Promise<Manga | null>
```

When `includeDetail` is true, load `['authors', 'genres', 'chapters', 'chapters.translations']` instead of just `['authors', 'genres']`. (Language and Translator are loaded eagerly on the Translation entity.)

Keep the existing method signature for backward compatibility; add the param as optional.

### 3. Service — `MangaService`

Update `findOne(id)` to accept and forward an optional `include` param:

```typescript
findOne(id: number, include?: string): Promise<MangaResponse | MangaDetailResponse>
```

Parse the `include` string — if it contains `chapters` and `translations`, pass `includeDetail = true` to the repository.

Map the result to `MangaDetailResponse` or `MangaResponse` accordingly.

### 4. Controller — `MangaController`

Update `@Get(':id')` to accept an optional query param:

```typescript
@Get(':id')
findOne(
  @Param('id') id: string,
  @Query('include') include?: string,
) {
  return this.mangaService.findOne(+id, include);
}
```

When no `include` param is given, behavior is identical to today.

### 5. Tests

- `manga.repository.spec.ts`: Add test for `findOneByIdWithRelations` with `includeDetail = true`
- `manga.service.spec.ts`: Update existing `findOne` describe block; add test for include param returning detail response
- `manga.controller.spec.ts`: Add test passing `?include=chapters,translations`

## Frontend Changes

### 1. New/Extended Types

In `frontend/src/services/api/mangaApi.ts`:

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

### 2. API Function

Update `getManga` to accept an optional `include` param and return the correct type:

```typescript
getManga(id: number, include?: string): Promise<MangaResponse | MangaDetailResponse>
```

When `include` is passed, append `?include=${include}` to the URL.

### 3. Hook

In `frontend/src/hooks/useManga.ts`:

```typescript
useManga(id: number, options?: { include?: string }): UseQueryResult<MangaResponse | MangaDetailResponse>
```

Pass the `include` option to `getManga`. Type narrowing happens at the call site (the detail page knows it gets `MangaDetailResponse`).

### 4. New Route: `/admin/mangas/$id`

Create `frontend/src/routes/admin/mangas/$id.tsx`.

**Page layout (top to bottom):**

```
┌─────────────────────────────────────────┐
│  ← Back to Manga List     [Edit Manga]  │  ← Breadcrumb + action button
├─────────────────────────────────────────┤
│  Manga Info Card (read-only)            │  ← Title, status badge, description,
│  Title | Status | Description           │     authors chips, genres chips,
│  Authors: [Author1] [Author2]           │     cover path, alt titles, dates
│  Genres: [Genre1] [Genre2]             │
│  Cover: /path/to/cover                 │
│  Created: ... | Updated: ...            │
├─────────────────────────────────────────┤
│  Chapter Table                          │  ← Number | Title | Release Date |
│  ┌───┬───────┬──────┬──────┐           │     Note | Actions
│  │ # │ Title │ Date │ Note │           │     (Edit/Delete)
│  ├───┼───────┼──────┼──────┼──────┤    │
│  │ 1 │ Ch1   │ ...  │ ...  │ ...  │▾   │  ← Expandable row
│  │   │ Lang     │ Transl.  │ Folder   │ │
│  │   │ English  │ TranslatorA│ /a/b/c  │ │  ← Translations sub-table
│  │   │ Japanese │ TranslatorB│ /d/e/f  │ │
│  └───┴───────┴──────┴──────┴──────┘    │
│  ... more chapters                      │
└─────────────────────────────────────────┘
```

**States:**

| State | Rendering |
|-------|-----------|
| Loading | Skeleton placeholders for info card + 5 skeleton rows |
| Error | `<ErrorDisplay>` with message |
| Empty (no chapters) | Normal info card + `<Empty>` component with "No chapters yet" |
| Data | Full view |

### 5. Navigation Changes

- **Manga list page**: Row click → navigates to `/admin/mangas/$id`
- **Actions column**: Keep Edit button (existing) + add View button (both stay)
- **Detail page**: Has an "Edit Manga" button → navigates to `/admin/mangas/$id/edit`

### 6. Route Registration

Run `npm run generate-routes` after creating the file. (If the file follows the TanStack Router file convention, it auto-registers.)

## Files Changed/Added

### Backend
- `backend/src/modules/manga/dto/manga-response.dto.ts` — **NEW** (MangaResponse, MangaDetailResponse, etc.)
- `backend/src/modules/manga/manga.repository.ts` — modify `findOneByIdWithRelations`
- `backend/src/modules/manga/manga.service.ts` — update `findOne`
- `backend/src/modules/manga/manga.controller.ts` — add `@Query('include')`
- `backend/src/modules/manga/manga.controller.spec.ts` — add test
- `backend/src/modules/manga/manga.service.spec.ts` — add test
- `backend/src/modules/manga/manga.repository.spec.ts` — add test

### Frontend
- `frontend/src/services/api/mangaApi.ts` — new types + updated `getManga`
- `frontend/src/hooks/useManga.ts` — add `options` param
- `frontend/src/routes/admin/mangas/$id.tsx` — **NEW** detail page
- `frontend/src/routes/admin/mangas/index.tsx` — add row click navigation
- `frontend/src/routeTree.gen.ts` — auto-generated

## Acceptance Criteria Checklist

- [ ] Navigating to `/admin/mangas/{id}` shows manga detail with all metadata
- [ ] Chapter list table renders with Number, Title, Release Date, Folder Path, Note columns
- [ ] Translations are visible per chapter via expandable table rows
- [ ] Loading state shows skeletons
- [ ] Error state shows ErrorDisplay with message
- [ ] Empty state shows Empty component when no chapters
- [ ] Manga list row click navigates to detail page
- [ ] Action column has both Edit and View buttons
- [ ] Detail page has "Edit Manga" button linking to edit page
- [ ] Existing `GET /mangas/:id` without `?include=` continues working as before
- [ ] All backend tests pass (existing + new)
- [ ] All frontend checks pass
- [ ] No regressions to admin manga list or other admin pages
