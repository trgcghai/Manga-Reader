# Design: Server-Side Search Filter for Tracking Sources List

Date: 2026-08-04
Status: Approved (design)
Task: MR125

## Problem

The Tracking page needs to filter the tracking sources table by a free-text
term (manga title or source name). `GET /tracking-sources` currently accepts
only `mangaId`, `page`, `limit` — there is no search support, so filtering
would have to be done client-side (unpaginated, unscalable).

## Decision: Parameter Name

The feature request originally specified `q=`, but the existing manga list
endpoint already uses `?search=` for the same concept
(`manga.controller.ts:67`, `manga.repository.ts:32-39`). Per product decision,
the tracking sources endpoint uses **`search`** to stay consistent with the
rest of the API. MR126/MR127 (frontend) will use the same name.

## Scope

Backend-only (MR125). No frontend changes; no entity/DTO changes.

## Approach

Follow the existing manga repository search pattern (`LOWER(x) LIKE
LOWER(:search)` with `%term%` parameter) instead of Postgres-specific `ILIKE`,
to keep one SQL dialect across the codebase.

### Changes

1. `backend/src/modules/tracking/tracking.controller.ts`
   - `@Get()` handler: add `@ApiQuery({ name: 'search', required: false })`
     and `@Query('search') search?: string`; forward to the service.
   - Final query params: `mangaId`, `page`, `limit`, `search`.

2. `backend/src/modules/tracking/tracking.service.ts`
   - `findAllSources(mangaId?, page?, limit?, search?)`: normalize the term
     (`search?.trim() || undefined`) and forward `undefined` when blank, so an
     empty/whitespace term adds no filter.

3. `backend/src/modules/tracking/tracking.repository.ts`
   - `findAllSourcesPaginated(mangaId?, page?, limit?, search?)`: when
     `search` is truthy, add
     `(LOWER(source.name) LIKE LOWER(:search) OR LOWER(manga.title) LIKE LOWER(:search))`
     with `{ search: '%' + search + '%' }` via `andWhere` — the existing
     `mangaId` filter (`qb.where('source.mangaId = :mangaId')`) is preserved
     and the two conditions AND together.
   - `leftJoinAndSelect('source.manga', 'manga')` already present — no new
     join. `getManyAndCount()` then computes `total` against the filtered set.

### Tests

- `tracking.controller.spec.ts` — assert `search` is forwarded to the service.
- `tracking.service.spec.ts` — assert `search` forwarded to
  `findAllSourcesPaginated`; blank/whitespace term forwarded as `undefined`.
- New `tracking.repository.spec.ts` — mocked QueryBuilder (pattern:
  `manga.repository.spec.ts:255-282`):
  - SQL contains both `LOWER(source.name) LIKE LOWER(:search)` and
    `LOWER(manga.title) LIKE LOWER(:search)`
  - parameters include `{ search: '%naruto%' }`
  - `mangaId` + `search` combine with AND
  - empty/whitespace `search` adds no clause

### Non-goals

- No search on source URL or alternative titles (spec: manga title + source
  name only).
- No debounce, no UI (MR126, MR127).
- No change to the existing `search` param of the manga endpoint.

## Verification

- `cd backend && npm run test` — all pass, including the new repository spec.
- `cd backend && npm run lint` — clean on touched files.
- Live check against running dev backend:
  `GET /tracking-sources?search=naruto` returns only matching sources;
  `?search=...&mangaId=24` applies both filters; no `search` returns all.
