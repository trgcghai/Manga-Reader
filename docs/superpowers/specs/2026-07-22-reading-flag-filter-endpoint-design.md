# MR109 — Backend readingFlag Filter on GET /mangas

## Summary

Add a `readingFlag` query parameter to `GET /mangas` to filter manga by their reading flag. Supports specific flag values (`reading`, `re-reading`, etc.) and a special `any` value to retrieve all manga with a non-null reading flag.

## Design

### Endpoint Change

`GET /mangas?readingFlag=reading` — filter by specific flag
`GET /mangas?readingFlag=any` — all flagged manga (readingFlag IS NOT NULL)
`GET /mangas` (no param) — existing behavior, returns all

### Controller

Add `@Query('readingFlag')` string parameter to `findAll`. Annotate with `@ApiQuery` showing possible values (6 flags + `any`).

### Service

Pass the `readingFlag` string through to `MangaRepository.findAll`.

### Repository

In `findAll`, before the ORDER BY clause:
- If `readingFlag === 'any'`: `query.andWhere('manga.readingFlag IS NOT NULL')`
- Else if `readingFlag` is truthy: `query.andWhere('manga.readingFlag = :readingFlag', { readingFlag })`
- Otherwise: no filter (existing behavior)

### Validation (Service Layer)

In `MangaService.findAll`, validate `readingFlag` against allowed values before passing to repository. If the value is provided and is not one of the 6 enum values or `'any'`, throw a `BadRequestException` with a descriptive message.

## Files Changed

- `backend/src/modules/manga/manga.controller.ts` — add `readingFlag` query param
- `backend/src/modules/manga/services/manga.service.ts` — pass `readingFlag` to repository
- `backend/src/modules/manga/repositories/manga.repository.ts` — add WHERE clause
