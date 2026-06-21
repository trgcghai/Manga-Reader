# MR74: Prev/Next Chapter Translation Navigation — Design

## Summary

Extend `GET /mangas/translations/:id` response with `prevTranslationId` and `nextTranslationId` so the reader frontend can build chapter-prev/next links without additional API calls.

## Algorithm

For each direction (prev/next chapter), pick the best translation ID using priority:

1. **Same translator + same language** — `translator.id` AND `language.id` match the current translation
2. **Same language** — any translation with matching `language.id`
3. **Any translation** — first translation found

Returns `null` if no adjacent chapter exists or the adjacent chapter has zero translations.

## Architecture

```
MangaController.getTranslation()
  └─ TranslationService.findOne(id)
       ├─ translationRepo.findById(id)          // existing, loads chapter + manga
       ├─ chapterRepo.findAdjacent(prev)        // new — LIMIT 1, LessThan, ORDER DESC
       ├─ chapterRepo.findAdjacent(next)        // new — LIMIT 1, MoreThan, ORDER ASC
       │   └─ each returns Chapter with translations.language + translations.translator
       └─ resolveAdjacent()                     // in-memory 3-step priority filter
            → prevTranslationId: number | null
            → nextTranslationId: number | null
```

Both directions run in parallel via `Promise.all`.

## Detailed Changes

### 1. DTO — `TranslationDetailResponse`

Add two required fields (`number | null`, always present):

```typescript
prevTranslationId: number | null;
nextTranslationId: number | null;
```

File: `backend/src/modules/manga/dto/translation.dto.ts`

### 2. Repository — `ChapterRepository.findAdjacent`

```typescript
findAdjacent(
  mangaId: number,
  currentNumber: number,
  direction: 'prev' | 'next',
): Promise<Chapter | null>
```

Uses `LessThan`/`MoreThan` from TypeORM with `ORDER BY number DESC|ASC`. TypeORM's `findOne` applies implicit `LIMIT 1`. Relations load `translations` + `translations.language` + `translations.translator` (LEFT JOIN, so empty translation lists return as `[]`).

File: `backend/src/modules/manga/repositories/chapter.repository.ts`

### 3. Service — `TranslationService`

- Inject `ChapterRepository` into constructor
- Add private helper `resolveAdjacent(direction)` that calls `findAdjacent` and applies the 3-step priority filter
- Call both directions in `Promise.all`
- Return `prevTranslationId` and `nextTranslationId` in the response

No new service class needed. No module wiring changes (ChapterRepository already a provider in MangaModule).

File: `backend/src/modules/manga/services/translation.service.ts`

### 4. Tests — `TranslationService.findOne`

- Add `mockChapterRepo` with `findAdjacent` mock
- Existing test: add `chapter.number` to mock translation, assert both new fields are `null` when no adjacent chapters exist
- 5 new sub-tests:

| Case | Adjacent chapter | Translations | Expected |
|------|-----------------|-------------|----------|
| Exact match | exists | translatorId=1, languageId=1 | `prevTranslationId: 99` |
| Language fallback | exists | translatorId=2, languageId=1 | fallback ID |
| Any fallback | exists | translatorId=2, languageId=2 | first ID |
| Empty chapter | exists | `[]` | `null` |
| Both directions | both exist | exact matches | both IDs set |

File: `backend/src/modules/manga/services/translation.service.spec.ts`

### 5. Frontend — Type

Add `prevTranslationId: number | null` and `nextTranslationId: number | null` to the `TranslationDetailResponse` interface. No other frontend changes needed.

File: `frontend/src/types/translation.ts`

## Performance

At most 2 extra SELECT queries per `getTranslation` call, each returning 1 row with a small number of related translations (typically 1-5 per chapter). No full table scans — both queries use the indexed `(mangaId, number)` composite unique key.

## Edge Cases

- **Single chapter manga**: both `null`
- **First chapter**: `prevTranslationId: null` (no chapter with number < current)
- **Last chapter**: `nextTranslationId: null`
- **Decimal chapter numbers** (e.g., 1.5): handled naturally by `LessThan`/`MoreThan`
- **Chapter with 0 translations**: `null` (the `translations ?? []` guard handles undefined)
- **Multiple translations with same language**: picks the first one found (array order)
