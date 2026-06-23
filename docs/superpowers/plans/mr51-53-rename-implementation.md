# Implementation Plan: folderPath → url Rename (MR51–53)

## Dependency Chain
```
MR51 (DB + entity) → MR52 (backend code) → MR53 (frontend code)
```
Each MR depends on the previous one. No parallelism.

---

## MR51: Database Migration + Entity

**Skills to load:** `nestjs-best-practices`

### Steps

1. **Create migration directory and file**
   - New file: `backend/src/common/migrations/RenameFolderPathToUrl.ts`
   - Extends `MigrationInterface` with `up()` only
   - Uses `queryRunner.hasColumn('translation', 'folderPath')` and `queryRunner.hasColumn('translation', 'url')` for safety
   - SQL: `ALTER TABLE "translation" RENAME COLUMN "folderPath" TO "url"`

2. **Update entity**
   - `translation.entity.ts` line 36: `folderPath: string` → `url: string`

3. **Update TypeORM config**
   - `app.module.ts` line 38: `synchronize: true` → `synchronize: false`
   - Add `migrationsRun: true`
   - Add `migrations: [RenameFolderPathToUrl]` import

4. **Verify**
   - `cd backend && npx tsc --noEmit` (compiles)
   - `cd backend && npm test` (tests pass — entity change may break specs, but MR52 fixes those)

**Checkpoint:** Backend compiles after entity + config changes.

---

## MR52: Backend Code Rename

**Skills to load:** `nestjs-best-practices`, `javascript-typescript-jest`

### Steps

Rename `folderPath` → `url` in:

1. **DTOs** (3 files, 3 occurrences)
   - `dto/chapter.dto.ts` line 20
   - `dto/manga.dto.ts` line 36
   - `dto/translation.dto.ts` line 15

2. **Services** (3 files, 5 occurrences)
   - `services/chapter.service.ts` lines 58, 74
   - `services/translation.service.ts` lines 46, 47
   - `services/manga.service.ts` line 96

3. **Spec/test files** (7 files, 13 occurrences)
   - `services/chapter.service.spec.ts` lines 71, 79, 158, 180
   - `services/manga.service.spec.ts` line 146
   - `services/translation.service.spec.ts` lines 35, 43, 120, 123, 136, 148
   - `repositories/manga.repository.spec.ts` line 49
   - `repositories/translation.repository.spec.ts` lines 49, 83, 86
   - `manga.controller.spec.ts` line 295

4. **Verify**
   - `cd backend && npx tsc --noEmit` (0 errors)
   - `cd backend && npm test` (all tests green)

**Checkpoint:** Backend fully clean — compiles and all tests pass.

---

## MR53: Frontend Rename

**Skills to load:** `tanstack-router-best-practices`

### Steps

Rename `folderPath` → `url` in:

1. **API types** (1 file, 3 occurrences)
   - `services/api/mangaApi.ts` lines 38, 69, 153 — three interfaces

2. **Dialog components** (3 files, 11 occurrences)
   - `AddChapterDialog.tsx` — schema, defaults, form field name
   - `AddTranslationDialog.tsx` — schema, defaults, payload, form field name
   - `EditTranslationDialog.tsx` — schema, defaults, payload, form field name

3. **Display route** (1 file, 1 occurrence)
   - `routes/admin/mangas/$id.index.tsx` line 320

4. **Verify**
   - `cd frontend && npm run build` (0 errors)
   - `cd frontend && npm run lint` (clean)

**Checkpoint:** Frontend builds and lints cleanly.

---

## Post-Merge Cleanup

- Rebuild `dist/` artifacts (auto-generated, no action needed)
- No `.spec` or test changes needed for frontend — no frontend tests reference `folderPath`

## Rollback Plan

If migration fails:
- Migration is idempotent — re-running is safe
- `synchronize: false` prevents auto-schema changes
- To revert: `ALTER TABLE "translation" RENAME COLUMN "url" TO "folderPath"` + restore entity code
