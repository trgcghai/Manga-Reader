# MR106 — Reading Flag API Endpoint Design

## Summary

Create a dedicated `PATCH /mangas/:mangaId/flag` endpoint to update the manga's reading flag independently of other manga fields. Accepts a JSON body with the new flag value or `null` to clear it.

## Design

### Endpoint

`PATCH /mangas/:mangaId/flag`

### Request Body

```json
{ "flag": "reading" }
```

- `flag`: one of `reading`, `re-reading`, `planned`, `completed`, `paused`, `dropped`, or `null` (to clear).

### Response

Returns the full `MangaResponse` with the updated `readingFlag`.

### Components

**DTO** — `UpdateMangaFlagDto` in `manga.dto.ts`:
- `flag?: ReadingFlag` — optional, validated against `ReadingFlag` enum via `@IsEnum`

**Repository** — `MangaRepository.updateFlag(id, flag)`:
- Updates only the `readingFlag` column
- Reuses existing `this.update()` internally

**Service** — `MangaService.updateFlag(id, flag)`:
- Validates manga exists (404 if not found)
- Delegates to repository

**Controller** — new `PATCH :mangaId/flag` route:
- Parses `mangaId` with `ParseIntPipe`
- Passes `dto.flag ?? null` to service

### Error Handling

- 404 if manga ID does not exist
- 400 for invalid enum value (handled by `@IsEnum` + NestJS ValidationPipe)

## Files Changed

- `backend/src/modules/manga/dto/manga.dto.ts` — add `UpdateMangaFlagDto`
- `backend/src/modules/manga/repositories/manga.repository.ts` — add `updateFlag`
- `backend/src/modules/manga/services/manga.service.ts` — add `updateFlag`
- `backend/src/modules/manga/manga.controller.ts` — add `PATCH :mangaId/flag` route
