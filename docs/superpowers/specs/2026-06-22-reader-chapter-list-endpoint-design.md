# MR86: Reader Chapter List Endpoint

## Overview

Implement `GET /mangas/reader/chapters` endpoint that returns a lightweight list of chapters for the chapter jump dropdown in the reader settings sheet. No CBZ URLs, page data, or availability flags.

## Endpoint

```
GET /mangas/reader/chapters?mangaId=<number>&translatorId=<number>&language=<string>
```

- `language` is a language code string (e.g., `"en"`, `"vi"`) matched against `Language.code`
- Missing manga returns `404 NotFoundException`
- Returns ordered array of `ReaderChapterItem`

## Response Shape

```json
[
  { "chapterId": 1, "title": "Chapter 1", "translationId": 10, "isFirstChapter": true, "isLatestChapter": false },
  { "chapterId": 2, "title": "Chapter 2", "translationId": 20, "isFirstChapter": false, "isLatestChapter": true },
  { "chapterId": 3, "title": null, "translationId": null, "isFirstChapter": false, "isLatestChapter": false }
]
```

## DTO: `ReaderChapterItem`

Added to `translation.dto.ts`:

```typescript
export class ReaderChapterItem {
  chapterId: number;
  title: string | null;
  translationId: number | null;
  isFirstChapter: boolean;
  isLatestChapter: boolean;
}
```

- `title` comes from `chapter.title` (nullable column on Chapter entity)

## Repository: `ChapterRepository`

New method:

```typescript
findAllByMangaId(mangaId: number): Promise<Chapter[]>
```

- Returns all chapters for the manga ordered by `number` ASC
- Includes relations: `translations`, `translations.language`, `translations.translator`

## Service: `ChapterService.getChapterList`

New method added to existing `ChapterService`:

```typescript
async getChapterList(
  mangaId: number,
  translatorId: number,
  language: string,
): Promise<ReaderChapterItem[]>
```

Algorithm:

1. Check manga exists via `mangaRepo.findOneById(mangaId)` → 404 if null
2. Fetch chapters via `chapterRepo.findAllByMangaId(mangaId)`
3. For each chapter (at index `i`), find best `translationId` using priority algorithm:
   - **Priority 1** — `translator.id === translatorId` AND `language.code === language`
   - **Priority 2** — `language.code === language` (any translator)
   - **No match** — `null`
4. Set `isFirstChapter = (i === 0)`, `isLatestChapter = (i === lastIndex)`
5. Map to `ReaderChapterItem[]`

Priority algorithm extracted as a `private` helper method.

## Controller: `MangaController`

New route:

```typescript
@Get('reader/chapters')
getReaderChapters(
  @Query('mangaId', ParseIntPipe) mangaId: number,
  @Query('translatorId', ParseIntPipe) translatorId: number,
  @Query('language') language: string,
)
```

- Delegates to `chapterService.getChapterList(mangaId, translatorId, language)`

## Module: `MangaModule`

No changes — `ChapterService` and `ChapterRepository` already registered.

## Tests

All tests in `chapter.service.spec.ts`:

| Case | Description |
|------|-------------|
| Exact match | Same translator + same language → correct `translationId` |
| Language fallback | Only language matches → fallback `translationId` |
| No match | No matching translation → `translationId: null` |
| Flags with 3 chapters | `isFirstChapter` on index 0, `isLatestChapter` on last |
| Single chapter | Both flags `true` |
| Empty list | Manga exists, no chapters → `[]` |
