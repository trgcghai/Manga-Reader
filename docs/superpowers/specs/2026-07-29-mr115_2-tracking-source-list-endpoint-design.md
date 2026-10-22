# MR115_2 — GET /tracking-sources List Tracking Sources Endpoint

## Overview

Add a `GET /tracking-sources` endpoint that returns a paginated list of tracking sources with an optional `mangaId` filter.

## Design Decisions

- Follow the existing pagination pattern from `AuthorRepository.findAll`: `createQueryBuilder` with `.skip()`/`.take()`/`.getManyAndCount()`, returning `{ data, total, page, limit, totalPages }`.
- Optional `mangaId` filter uses a `where` clause on the relation `manga.id = :mangaId`.
- Default page size is 20, consistent with the rest of the codebase.
- No separate query DTO — use `@Query()` param decorators directly in the controller (matching the `AuthorController` pattern).
- The existing `findAllSources()` method (used for duplicate checking in `createSource`) is kept unchanged; a new `findAllSourcesPaginated()` method is added.

## Modified Files

### `tracking.repository.ts`
- Add `findAllSourcesPaginated(mangaId?: number, page = 1, limit = 20)` returning `{ data: TrackingSource[], total, page, limit, totalPages }`
- Uses `createQueryBuilder('source')` with optional `where('source.mangaId = :mangaId', { mangaId })` and `.leftJoinAndSelect('source.manga', 'manga')`

### `tracking.service.ts`
- Add `findAllSources(mangaId?: number, page = 1, limit = 20)` — thin delegate to repository, maps results to `TrackingSourceResponseDto[]`

### `tracking.controller.ts`
- Add `@Get()` handler with `@Query('mangaId') mangaId?: number`, `@Query('page') page = '1'`, `@Query('limit') limit = '20'`
- `@ApiQuery` decorators for Swagger docs

## Tests

- Service: paginated list returns correct shape, filters by mangaId, respects page/limit, default limit is 20, empty data when no results
- Controller: delegates to service, passes query params correctly

## Out of Scope

- Sorting options (always ASC by id)
- Search/full-text filter
