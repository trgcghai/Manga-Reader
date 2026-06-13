# MR14: Language Seeding and List-Only API — Plan

## Tasks

### Task 1: Create `src/common/constants/language.constant.ts`
**Skill:** (none — pure data)
- Export `LANGUAGE_SEED: Array<Pick<Language, 'code' | 'name'>>` with all ISO 639-1 codes (~184 entries)
- References Language entity from the new module location

### Task 2: Create `src/modules/language/entities/language.entity.ts`
**Skill:** (none — entity move)
- Move entity from `translator/entities/` (same content)
- Delete old file at `translator/entities/language.entity.ts`

### Task 3: Create `src/modules/language/language.repository.ts` + spec
**Skill:** `javascript-typescript-jest` + `test-driven-development`
- `findAll()` returns all Language records (no pagination, no where clause)
- Follow AuthorRepository/GenreRepository pattern
- Write spec first, then implementation

### Task 4: Create `src/modules/language/language.service.ts` + spec
**Skill:** `nestjs-testing` + `test-driven-development`
- `findAll()` delegates to `LanguageRepository.findAll()`
- No create(), update(), delete() methods
- Write spec first, then implementation

### Task 5: Create `src/modules/language/language.controller.ts` + spec
**Skill:** `nestjs-testing` + `test-driven-development`
- `GET /language` → returns all languages
- No POST, PATCH, DELETE routes
- Write spec first, then implementation

### Task 6: Create `src/modules/language/language.module.ts` + `src/common/seed/language.seed.ts`
**Skill:** `nestjs-best-practices`
- Module imports `TypeOrmModule.forFeature([Language])`
- Module provides: `LanguageService`, `LanguageRepository`, `LanguageSeedService`
- Module exports: `LanguageService`
- `LanguageSeedService` implements `OnApplicationBootstrap`, seeds if count === 0

### Task 7: Update files for new module structure
**Skill:** (none — simple edits)
- `src/modules/chapter/entities/translation.entity.ts` — update import path to `src/modules/language/entities/language.entity`
- `src/app.module.ts` — add `LanguageModule` to imports array

## Verification
- Run `npm run lint` in backend
- Run `npm run test` in backend
- Confirm `GET /language` returns seeded languages
- Confirm POST/PATCH/DELETE `/language/*` return 404
- Confirm `GET /language` does not duplicate seeds on restart
