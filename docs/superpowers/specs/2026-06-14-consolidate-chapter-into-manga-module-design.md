# Consolidate Chapter Into Manga Module

## Goal

Merge the standalone Chapter module into the Manga module, removing unnecessary module boundaries while preserving entity relationships.

## Scope

- Move `Chapter` and `Translation` entities from `modules/chapter/entities/` to `modules/manga/entities/`
- Delete `ChapterModule`, `ChapterController`, `ChapterService` and their tests
- Remove `GET /chapter/scan` endpoint
- Remove `scanImages` service method and its test fixtures
- Keep `chapter.constant.ts` in `src/common/constants/` (future use)
- No new `Page` entity created
- No new chapter service layer introduced

## Changes

### Files to move
- `backend/src/modules/chapter/entities/chapter.entity.ts` → `backend/src/modules/manga/entities/chapter.entity.ts`
- `backend/src/modules/chapter/entities/translation.entity.ts` → `backend/src/modules/manga/entities/translation.entity.ts`

### Files to delete
- `backend/src/modules/chapter/chapter.module.ts`
- `backend/src/modules/chapter/chapter.controller.ts`
- `backend/src/modules/chapter/chapter.service.ts`
- `backend/src/modules/chapter/chapter.controller.spec.ts`
- `backend/src/modules/chapter/chapter.service.spec.ts`
- `backend/src/modules/chapter/__fixtures__/` (entire directory)

### Files to update
- `manga.entity.ts` — update Chapter import to relative path
- `chapter.entity.ts` — update Manga import to new location
- `manga.module.ts` — add `Chapter` and `Translation` to `TypeOrmModule.forFeature()`
- `app.module.ts` — remove `ChapterModule` import and from `imports` array

### Verification
- `npm run test` passes
- `npm run build` compiles
