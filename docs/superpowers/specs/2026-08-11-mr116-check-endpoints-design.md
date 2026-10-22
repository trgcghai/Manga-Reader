# MR116 — Tracking Source Check Endpoints: Design

Date: 2026-08-11
Source task: `tasks/MR116.md`

## Goal

Implement backend logic that calls external tracking source URLs, extracts the latest chapter number from the response, compares it with the stored value, and persists the value when a newer chapter is found. Three new endpoints cover single-source, per-manga, and all-source checks.

## Decisions (brainstorming clarifications)

1. Valid JSON with no extractable chapter number → same **422** as a parse failure ("response parsing failed").
2. `check-manga` and `check-all` **always return 200** with per-source `error` fields; a failing source never fails the aggregate request.
3. `check-manga` returns **404** when the manga does not exist; returns 200 with an empty array when the manga has no tracking sources.

## Architecture

Approach A: extractor strategy classes plus three check methods on `TrackingService`, matching the spec's file change list.

### Data layer

- `TrackingSource` entity: add `@Column({ nullable: true, default: null }) extractorPath: string | null`.
- DTOs (`tracking-source.dto.ts`):
  - `CreateTrackingSourceDto` and `UpdateTrackingSourceDto`: optional `@IsOptional() @IsString() extractorPath?: string`.
  - `TrackingSourceResponseDto`: include `extractorPath: string | null`.
  - `createSource`/`updateSource` persist and map `extractorPath` (create only when provided; update only when present).
- `TrackingRepository` additions:
  - `findAllSourcesForCheck(): Promise<TrackingSource[]>` — all sources with `manga` relation loaded.
  - `findByMangaIdForCheck(mangaId): Promise<TrackingSource[]>` — sources for a manga with relation loaded.
  - Reuse existing `findSourceById(id)` (already loads `manga`) for single-source checks.

### Extractor strategy (`extractors/` folder, new files)

- `chapter-extractor.interface.ts`:
  - `export interface ChapterExtractor { extract(responseBody: unknown): string | null }`
- `json-path-extractor.ts`: `class JsonPathExtractor implements ChapterExtractor`
  - Constructor takes optional path (`string | null | undefined`).
  - No path: read root `responseBody.chapterNumber`.
  - With path: navigate dot-notation segments supporting array indices, e.g. `data.chapters[0].number`.
  - Returns `String(value)` when the final value is a primitive (string/number), otherwise null.
  - Missing/undefined intermediate segments return null (e.g. `data.chapters[0].number` when `chapters` is empty).

### Check logic (`TrackingService`)

- `TrackingModule` imports `HttpModule.register({ timeout: 10000 })` (@nestjs/axios + axios added to `backend/package.json`); `HttpService` injected into `TrackingService`.
- Private `compareChapterNumbers(previous, current): 'newer' | 'same' | 'different'`:
  - Parse both with `parseFloat()`; if both are finite numbers → numeric comparison (`'newer'`/`'same'`/`'different'`).
  - If either fails to parse → strict string equality: equal → `'same'` (i.e. no update), unequal → `'different'` (reported but not persisted).
- Private `performSourceCheck(source): CheckSourceResult`:
  1. `httpService.axiosRef.get(source.url)`.
  2. Network/timeout/5xx axios error → throw `BadGatewayException` (502, "URL is unreachable"); handled by the single-source path only.
  3. `JSON.parse(response.data)` failure → `UnprocessableEntityException` (422, "response parsing failed").
  4. Run extractor (path from `source.extractorPath`); null result → same 422.
  5. Compare with `source.latestChapterNumber`.
  6. Newer → persist via `trackingRepository.updateSource(id, { latestChapterNumber: current })`; result includes `previous`, `current`, `mangaId`.
  7. Not newer → no persistence.
- Public methods:
  - `checkSource(id)` → 404 via `NotFoundException` when source missing; returns `{ updated: true, previous, current, mangaId }` or `{ updated: false, current }`.
  - `checkMangaSources(mangaId)` → 404 via `NotFoundException` when manga missing (checked via `MangaRepository.findOneById`); empty array (200) when no sources; otherwise rejects/fulfills per-source and aggregates.
  - `checkAllSources()` → aggregates over every source in the database.

- Aggregation shape (shared private helper):
  ```
  { sourceId, sourceName, url, updated, previous?, current?, error? }
  ```
  - `Promise.allSettled` over per-source promises; fulfilled results map their payload, rejected results contribute their `error` message and `updated: false`.
  - Aggregate request never throws because of individual source failures.

### Controller (`tracking.controller.ts`)

- `POST :id/check` → `checkSource(parseInt(id, 10))`.
- `POST check-manga/:mangaId` → `checkMangaSources(parseInt(mangaId, 10))`.
- `POST check-all` → `checkAllSources()`.
- No route conflicts: `POST :id/check` has two segments, `check-all` has one; `check-manga/:mangaId` is a distinct literal prefix.
- Swagger: `@ApiOperation`, `@ApiOkResponse`, `@ApiNotFoundResponse`, `@ApiBadGatewayResponse`, `@ApiUnprocessableEntityResponse` as appropriate. Result objects returned as plain interfaces (no new DTO classes) to keep the diff small.

### Error handling summary

| Condition | Status | Body/behavior |
| --- | --- | --- |
| Source (single check) not found | 404 | `NotFoundException` |
| Manga (check-manga) not found | 404 | `NotFoundException` |
| URL unreachable / timeout / transport error | 502 | "URL is unreachable" |
| Invalid JSON or chapter not extractable | 422 | "response parsing failed" |
| Individual source failure in aggregate | (200 overall) | `error` field on that result |

### Testing

Unit tests following existing spec conventions (mocked repositories, `Test.createTestingModule`):

- `json-path-extractor.spec.ts`: root `chapterNumber` fallback; dot path; array index path; nested missing segments → null; non-primitive value → null.
- `tracking.service.spec.ts` additions:
  - `checkSource`: newer → persists + returns `{ updated: true, previous, current, mangaId }`; same/older → no persist + `{ updated: false, current }`; 404; 502 on network error; 422 on JSON parse failure; 422 when extractor returns null; decimal comparison ("1120.5" > "1120").
  - `checkMangaSources`: 404 missing manga; 200 empty array when no sources; per-source aggregation; partial failure leaves other results intact.
  - `checkAllSources`: aggregates all sources; partial failure leaves other results intact.
  - `createSource`/`updateSource`: persist `extractorPath`.
- `tracking.controller.spec.ts` additions: three endpoints wired to service methods with correct params.

Mocked `HttpService`: `{ axiosRef: { get: jest.fn() } }`.

## Files to create

- `backend/src/modules/tracking/extractors/chapter-extractor.interface.ts`
- `backend/src/modules/tracking/extractors/json-path-extractor.ts`
- `backend/src/modules/tracking/extractors/json-path-extractor.spec.ts`

## Files to change

- `backend/package.json` — add `@nestjs/axios`, `axios`
- `backend/src/modules/tracking/tracking.module.ts` — import `HttpModule` (10s timeout)
- `backend/src/modules/tracking/entities/tracking-source.entity.ts` — `extractorPath`
- `backend/src/modules/tracking/dto/tracking-source.dto.ts` — `extractorPath` on create/update/response DTOs
- `backend/src/modules/tracking/tracking.repository.ts` — two check query methods
- `backend/src/modules/tracking/tracking.service.ts` — check logic + extraction wiring
- `backend/src/modules/tracking/tracking.controller.ts` — three endpoints
- `backend/src/modules/tracking/tracking.service.spec.ts` — check tests
- `backend/src/modules/tracking/tracking.controller.spec.ts` — endpoint wiring tests

## Out of scope

- Scheduled/cron execution of checks (config `frequency`/`interval`/`runAt` wiring exists in a later task).
- Frontend check UI, alternative extractor types (CSS/regex), SSRF hardening, pagination of `check-all`.