# MR39: Create Chapter API — Design Spec

## Overview

Add a `POST /mangas/:mangaId/chapter` endpoint that creates a new chapter (or reuses an existing one by number) and an associated translation record, all within the Manga module.

## Architecture

- **Service:** `ChapterService` in `modules/manga/services/chapter.service.ts`
- **Repositories:** `ChapterRepository`, `TranslationRepository` in `modules/manga/` (custom TypeORM wrappers following Author/Genre repository pattern)
- **Controller:** New route on existing `MangaController`
- **Module wiring:** `MangaModule` imports `LanguageModule` and `TranslatorModule` to access their services; registers `ChapterService`, `ChapterRepository`, `TranslationRepository`

## Endpoint

```
POST /mangas/:mangaId/chapter
```

### Request Body (`CreateChapterDto`)

| Field | Type | Required | Validates | Target Entity |
|-------|------|----------|-----------|---------------|
| `number` | number | yes | `@IsNumber()`, `@Min(0)` | Chapter |
| `title` | string | yes | `@IsString()`, `@MinLength(1)` | Chapter |
| `releaseDate` | string (ISO date) | no | `@IsOptional()`, `@IsDateString()` | Chapter |
| `note` | string | no | `@IsOptional()`, `@IsString()` | Chapter |
| `languageId` | number | yes | `@IsNumber()` | Translation |
| `translatorId` | number | yes | `@IsNumber()` | Translation |
| `folderPath` | string | yes | `@IsString()`, `@MinLength(1)` | Translation |

### Response

- **201 Created** — Returns the Chapter entity with its `translations` relation loaded (auto-wrapped in `ApiSuccessResponse` by the global `ResponseInterceptor`)

## Service Logic (`ChapterService.create`)

```
1. Fetch manga by mangaId → 404 if not found
2. Fetch language by languageId → 400 if not found
3. Fetch translator by translatorId → 400 if not found
4. Look for existing Chapter by (mangaId, number)
   ├── Found? →
   │   Check TranslationRepository for duplicate (chapterId, languageId, translatorId)
   │   ├── Exists? → 409 Conflict ("A translation for chapter #{number} with this language and translator already exists")
   │   └── New? → Create Translation only (link to existing chapter)
   └── Not found? → Create Chapter + Translation
5. Return Chapter entity with translations loaded
```

## Repositories

### ChapterRepository
```
findByMangaAndNumber(mangaId: number, number: number): Promise<Chapter | null>
create(data: Partial<Chapter>): Promise<Chapter>
```

### TranslationRepository
```
findByChapterAndLanguageAndTranslator(chapterId: number, languageId: number, translatorId: number): Promise<Translation | null>
create(data: Partial<Translation>): Promise<Translation>
```

## Error Handling

| Condition | HTTP Status | Message |
|-----------|-------------|---------|
| Manga not found | 404 | `Manga #${mangaId} not found` |
| Language not found | 400 | `Language #${languageId} not found` |
| Translator not found | 400 | `Translator #${translatorId} not found` |
| Duplicate translation | 409 | `A translation for chapter #${number} with this language and translator already exists` |
| Validation errors | 400 | Auto from `ValidationPipe` |

## Files Changed

### New Files
- `backend/src/modules/manga/dto/chapter.dto.ts`
- `backend/src/modules/manga/chapter.repository.ts`
- `backend/src/modules/manga/translation.repository.ts`
- `backend/src/modules/manga/services/chapter.service.ts`
- `backend/src/modules/manga/services/chapter.service.spec.ts`

### Modified Files
- `backend/src/modules/manga/manga.module.ts` — register new providers, import LanguageModule + TranslatorModule
- `backend/src/modules/manga/manga.controller.ts` — add POST route
- `backend/src/modules/manga/manga.controller.spec.ts` — add endpoint tests

## Testing (Whitebox)

### ChapterService — 8 test cases covering all branches

| # | Test | Expected |
|---|------|----------|
| 1 | Manga not found | `NotFoundException` thrown |
| 2 | Language not found | `BadRequestException` thrown |
| 3 | Translator not found | `BadRequestException` thrown |
| 4 | Chapter exists + translation exists (duplicate) | `ConflictException` thrown |
| 5 | Chapter exists + translation new | Translation created, chapter not re-created |
| 6 | Chapter does not exist | Both Chapter and Translation created |
| 7 | DTO validation: missing required fields | Validation pipe rejects |
| 8 | DTO validation: negative number | Validation pipe rejects |

### MangaController — 3 test cases
| # | Test | Expected |
|---|------|----------|
| 1 | Successful creation returns 201 | Delegates to service, returns result |
| 2 | Service throws NotFoundException | 404 propagated |
| 3 | Service throws ConflictException | 409 propagated |

## Edge Cases & Notes
- Chapter `number` supports decimals (e.g., 100.5) — `decimal(6,2)` in DB, `@IsNumber()` in DTO
- `releaseDate` is stored as `Date` in Chapter; DTO accepts ISO string, converted via `new Date()` in service
- If `note` is null/undefined, stored as `null` in Chapter
- DB `@Unique(['chapter', 'language', 'translator'])` constraint on Translation acts as the safety net for duplicates
- The existing stale import `from 'src/modules/manga/dto/update-manga.dto'` in spec files is out of scope for this MR
