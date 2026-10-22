# MR115_1 — POST /tracking-sources Create Tracking Source Endpoint

## Overview

Add a `POST /tracking-sources` endpoint to create tracking sources, with validation for manga existence, URL format, and duplicate prevention.

## Design Decisions

- Follow existing REST conventions: plural resource name (`tracking-sources`), `POST` for creation.
- The existing health check stays — moves to `GET /tracking-sources/health`.
- Validation is split between DTO (class-validator for `url`, `mangaId`, `name`) and service (manga existence, duplicates).
- `MangaModule` is imported into `TrackingModule` to access `MangaRepository` for manga validation.
- Duplicate checks use the existing `@Unique` constraints on `TrackingSource` entity as a fallback, with explicit service-level checks for better error messages.

## Modified Files

### `tracking.controller.ts`
- Change `@Controller('tracking')` → `@Controller('tracking-sources')`
- Move health check from `@Get()` to `@Get('health')`
- Add `@Post()` handler for create tracking source

### `tracking.service.ts`
- Inject `MangaRepository` and `TrackingRepository`
- Add `createSource(dto: CreateTrackingSourceDto)` method
  - Look up manga by `mangaId` — throw `NotFoundException` if missing
  - Check duplicate `(mangaId, name)` — throw `ConflictException` if exists
  - Check duplicate `(mangaId, url)` — throw `ConflictException` if exists
  - Save and return `TrackingSourceResponseDto`

### `tracking.module.ts`
- Import `MangaModule` to make `MangaRepository` available

### New file: `tracking.controller.spec.ts`
- Test: POST creates source and returns 201
- Test: POST with invalid mangaId returns 404
- Test: POST with duplicate (mangaId, name) returns 409
- Test: POST with duplicate (mangaId, url) returns 409
- Test: POST with malformed URL returns 400
- Test: Response body matches `TrackingSourceResponseDto` shape

## Out of Scope

- `GET /tracking-sources` listing endpoint
- `PATCH /tracking-sources/:id` update endpoint
- `DELETE /tracking-sources/:id` delete endpoint
- CRUD for `TrackingConfig`
