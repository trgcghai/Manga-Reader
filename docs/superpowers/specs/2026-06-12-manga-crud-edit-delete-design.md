# MR12: Manga CRUD Edit and Delete — Design Spec

## Overview

Extend the existing manga CRUD to support edit and delete operations. Admin can update manga metadata via a dedicated edit page and remove manga records with a confirmation dialog. Adds PATCH and DELETE endpoints, a new frontend route, and thorough whitebox unit tests.

## Backend

### UpdateMangaDto

All fields from `CreateMangaDto` become optional:

```
title?: string              — @IsOptional, @IsString, @MinLength(1)
status?: MangaStatus        — @IsOptional, @IsEnum(MangaStatus)
description?: string        — @IsOptional, @IsString
alternativeTitles?: string[] — @IsOptional, @IsString({ each: true })
coverPath?: string          — @IsOptional, @IsString
authors?: string[]          — @IsOptional, @IsString({ each: true })
genres?: string[]           — @IsOptional, @IsString({ each: true })
```

At least one field must be present — service throws `BadRequestException` if no updatable fields provided after filtering undefined values.

### Repository — new methods

- `update(id: string, data: Partial<Manga>): Promise<Manga | null>` — `this.repo.preload` + save; returns null if not found
- `delete(id: string): Promise<boolean>` — `this.repo.delete(id)`; returns true if affected > 0
- `findOneByIdWithRelations(id: string): Promise<Manga | null>` — loads `authors` and `genres` relations (extracted from existing pattern, reusable for edit page)

### Service — new methods

- `update(id: string, dto: UpdateMangaDto): Promise<Manga>`
  - Fetch existing manga with relations
  - If `dto.authors` present: resolve-or-create authors, replace relation
  - If `dto.genres` present: resolve-or-create genres, replace relation
  - Merge scalar fields, save, return updated manga
  - Throw `NotFoundException` if manga not found

- `delete(id: string): Promise<void>`
  - Check manga exists (throw `NotFoundException` if not)
  - Delete via repository
  - Cascade handles chapter removal

### Controller — new endpoints

- `PATCH /mangas/:id` — accepts `UpdateMangaDto`, returns updated Manga
- `DELETE /mangas/:id` — returns 204 No Content

### Whitebox Unit Tests

Service tests:

- `update`:
  - Updates all scalar fields successfully
  - Updates only a subset of fields (partial update)
  - Replaces authors list when provided
  - Replaces genres list when provided
  - Leaves existing authors/genres when not provided
  - Creates new author entities from new names
  - Throws `NotFoundException` when manga does not exist
  - Throws `NotFoundException` when manga was deleted between fetch and save
  - Handles empty authors/genres arrays (clears relations)
  - Handles special characters in author/genre names

- `delete`:
  - Deletes existing manga successfully
  - Throws `NotFoundException` when manga does not exist
  - Does not throw when manga already deleted (idempotency if desired — clarify: throw)
  - Returns 204 (controller test)

Controller tests:

- `PATCH /mangas/:id`:
  - Returns 200 with updated manga
  - Returns 404 when manga not found
  - Returns 400 with invalid DTO (empty body, invalid enum, too short title)

- `DELETE /mangas/:id`:
  - Returns 204 on success
  - Returns 404 when manga not found

Repository tests (via mocked TypeORM):

- `update`: verifies `preload` + `save` called with correct args
- `delete`: verifies `delete` called with id, returns boolean based on affected count
- `findOneByIdWithRelations`: verifies relations loaded

## Frontend

### Route

```
frontend/src/routes/admin/mangas/$id.edit.tsx  → edit manga page
```

Regenerate route tree via `npm run generate-routes`.

### Edit page (`/admin/mangas/:id/edit`)

- Load manga via `useManga(id)` query (`GET /mangas/:id`)
- Same form layout as create page (`new.tsx`), pre-populated with fetched data
- Fields: Title, Status, Description, Alternative Titles, Cover Path, Authors, Genres
- Submit via `useUpdateManga()` mutation (`PATCH /mangas/:id`)
- On success: invalidate list query, navigate to `/admin/mangas`
- Loading skeleton while fetching; error state if manga not found

### API client additions

- `getManga(id: string): Promise<MangaResponse>` — `GET /mangas/:id`
- `updateManga(id: string, data: UpdateMangaPayload): Promise<MangaResponse>` — `PATCH /mangas/:id`
- `deleteManga(id: string): Promise<void>` — `DELETE /mangas/:id`

### React Query hooks

- `useManga(id)` — single manga query, keyed `['mangas', id]`
- `useUpdateManga()` — mutation, invalidates `['mangas']` on success
- `useDeleteManga()` — mutation, invalidates `['mangas']` on success

### Delete flow on list page

- Actions column in table with Edit (link) and Delete (destructive icon) buttons
- Delete opens shadcn `Dialog` (to be added via `npx shadcn add dialog`):
  - Title: "Delete Manga"
  - Body: "Are you sure you want to delete [manga title]? This action cannot be undone."
  - Cancel button (outline) + Delete button (destructive)
- On confirm: calls `useDeleteManga()`, closes dialog
- On success: toast (optional), list refreshes via query invalidation

## Data Flow

1. **Edit**: List → click Edit → navigate to `/admin/mangas/:id/edit` → fetch manga → pre-populate form → submit PATCH → invalidate list → redirect to list
2. **Delete**: List → click Delete → open Dialog → confirm → DELETE → invalidate list → dialog closes → list updates

## Acceptance Criteria Covered

- [x] Admin can edit an existing manga record — dedicated edit page at `/admin/mangas/:id/edit`
- [x] Admin can delete a manga record after confirming — shadcn Dialog on list page
- [x] Updated manga data is reflected in the list view — query invalidation
- [x] Deleted manga no longer appears in the admin list — query invalidation
