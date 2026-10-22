# Fix: Tracking Source List Response Missing `mangaId`

Date: 2026-08-03
Status: Approved (design)

## Problem

Adding a new source from the "Manage Sources" dialog fails with a 400
(`mangaId must be an integer number`).

### Root cause

`GET /tracking-sources` returns raw `TrackingSource` entities, and the
serialized JSON does not include the implicit `mangaId` FK — only the nested
`manga` relation object. The frontend opens the dialog with
`source.mangaId` (undefined), so the create payload becomes
`{ mangaId: undefined, name, url }`. Axios `JSON.stringify` drops the
`undefined` key, the POST body arrives without `mangaId`, and the global
`ValidationPipe` rejects it against `CreateTrackingSourceDto.mangaId`
(`@IsInt()`, required).

Side effect of the same bug: the dialog's own list query
(`useTrackingSources(mangaId)`) receives `undefined` and loads all sources
unfiltered.

## Scope

Backend-only contract fix. No frontend changes.

The frontend type `TrackingSourceResponse` already declares
`mangaId: number`, and `createSource`/`updateSource` responses already
include it — only the list endpoint deviates.

## Approach

Map the paginated list result in `TrackingService.findAllSources` to a
response shape that includes `mangaId`, using the same mapping already used
by `createSource`/`updateSource`. Extract that mapping into one private
helper shared by all three methods (removes existing duplication).

### Changes

1. `backend/src/modules/tracking/tracking.service.ts`
   - Add private helper `toTrackingSourceResponseDto(source)` returning:
     - `id`, `mangaId` (from `source.manga.id`), `url`, `name`,
       `latestChapterNumber`
     - `createdAt` / `updatedAt` as ISO strings
     - nested `manga: { id, title }` (the frontend renders
       `source.manga?.title`; the joined relation is always loaded by
       `findAllSourcesPaginated`)
   - Use it in `createSource`, `updateSource`, and for each item in
     `findAllSources`'s paginated `data` (pagination envelope untouched).

2. `backend/src/modules/tracking/tracking.service.spec.ts`
   - Extend the `findAllSources` describe block with regression assertions:
     each returned item is DTO-mapped (`mangaId` present and equal to
     `manga.id`, ISO `createdAt`/`updatedAt`, `manga` preserved).
   - Existing `createSource`/`updateSource` assertions remain valid; they now
     exercise the same mapper.

### Non-goals

- No frontend changes (no defensive `manga?.id` fallback).
- No entity changes (`@JoinColumn` / explicit FK column).
- No changes to `UpdateTrackingSourceDto` or the create DTO.

## Verification

- `cd backend && npm run test` — all tests pass, including the new
  `findAllSources` mapping assertions.
- `cd backend && npm run lint` — no new violations.
- Live check against the running dev backend: `GET /tracking-sources`
  includes `mangaId` on each item; `POST /tracking-sources` with
  `{ mangaId, name, url }` succeeds; the dialog's add flow works.
