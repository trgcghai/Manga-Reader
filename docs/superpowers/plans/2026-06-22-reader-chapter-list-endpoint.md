# Reader Chapter List Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `GET /mangas/reader/chapters` returning a lightweight chapter list for the reader chapter jump selector.

**Architecture:** Add `getChapterList()` to existing `ChapterService`, backed by a new `findAllByMangaId()` on `ChapterRepository`. Endpoint on existing `MangaController`. Per-chapter priority algorithm picks best `translationId` (exact translator+language → same language → null).

**Tech Stack:** NestJS, TypeORM, Jest, TypeScript

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/modules/manga/dto/translation.dto.ts` | Modify | Add `ReaderChapterItem` DTO |
| `backend/src/modules/manga/repositories/chapter.repository.ts` | Modify | Add `findAllByMangaId(mangaId)` query |
| `backend/src/modules/manga/services/chapter.service.ts` | Modify | Add `getChapterList()` + private priority helper |
| `backend/src/modules/manga/services/chapter.service.spec.ts` | Modify | Add tests for `getChapterList` |
| `backend/src/modules/manga/manga.controller.ts` | Modify | Add `getReaderChapters()` endpoint |
| `backend/src/modules/manga/manga.controller.spec.ts` | Modify | Add test for new endpoint |
| `backend/src/modules/manga/manga.module.ts` | No change | Already registers all providers |

---

### Task 1: Add `ReaderChapterItem` DTO

**Related skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/dto/translation.dto.ts`

- [ ] **Add the DTO class**

At end of `translation.dto.ts`, before closing, add:

```typescript
export class ReaderChapterItem {
  chapterId: number;
  title: string | null;
  translationId: number | null;
  isFirstChapter: boolean;
  isLatestChapter: boolean;
}
```

- [ ] **Verify file still compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors

---

### Task 2: Add `findAllByMangaId` to `ChapterRepository`

**Related skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/repositories/chapter.repository.ts`

- [ ] **Add the new method**

After `findAdjacent` method (before the closing `}`), add:

```typescript
  findAllByMangaId = async (mangaId: number): Promise<Chapter[]> => {
    return await this.repo.find({
      where: { manga: { id: mangaId } },
      order: { number: 'ASC' },
      relations: [
        'translations',
        'translations.language',
        'translations.translator',
      ],
    });
  };
```

- [ ] **Verify file still compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors

---

### Task 3: Add `getChapterList` to `ChapterService`

**Related skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/services/chapter.service.ts`

- [ ] **Add imports**

Add to import section:

```typescript
import { Translation } from 'src/modules/manga/entities/translation.entity';
import { ReaderChapterItem } from 'src/modules/manga/dto/translation.dto';
```

- [ ] **Add private priority helper and public method**

Before the closing `}` of the class, add:

```typescript
  private findBestTranslationId(
    translations: Translation[],
    translatorId: number,
    languageCode: string,
  ): number | null {
    const exact = translations.find(
      (t) =>
        t.translator.id === translatorId && t.language.code === languageCode,
    );
    if (exact) return exact.id;

    const langMatch = translations.find(
      (t) => t.language.code === languageCode,
    );
    if (langMatch) return langMatch.id;

    return null;
  }

  getChapterList = async (
    mangaId: number,
    translatorId: number,
    language: string,
  ): Promise<ReaderChapterItem[]> => {
    const manga = await this.mangaRepo.findOneById(mangaId);
    if (!manga) {
      throw new NotFoundException('Manga #' + mangaId + ' not found');
    }

    const chapters = await this.chapterRepo.findAllByMangaId(mangaId);
    const lastIndex = chapters.length - 1;

    return chapters.map((chapter, index) => ({
      chapterId: chapter.id,
      title: chapter.title ?? null,
      translationId: this.findBestTranslationId(
        chapter.translations,
        translatorId,
        language,
      ),
      isFirstChapter: index === 0,
      isLatestChapter: index === lastIndex,
    }));
  };
```

- [ ] **Verify file compiles**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors

---

### Task 4: Add test suite for `getChapterList`

**Related skills:** `nestjs-testing`, `javascript-typescript-jest`, `test-driven-development`

**Files:**
- Modify: `backend/src/modules/manga/services/chapter.service.spec.ts`

- [ ] **Add `findAllByMangaId` to mock**

In the `mockChapterRepo` object, add `findAllByMangaId: jest.fn()`:

```typescript
  const mockChapterRepo = {
    findByMangaAndNumber: jest.fn(),
    create: jest.fn(),
    findAllByMangaId: jest.fn(),
  };
```

- [ ] **Add the test block**

After the `create` describe block (before the closing `})`), add:

```typescript
  describe('getChapterList', () => {
    const viLang = { id: 2, code: 'vi', name: 'Vietnamese' } as Language;
    const translatorB = { id: 2, name: 'Translator B' } as Translator;

    it('should return exact match translationId when translator and language match', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      const chapters = [
        {
          id: 1,
          number: 1,
          title: 'Chapter 1',
          translations: [
            { id: 10, language, translator, url: '/path' },
            { id: 11, language: viLang, translator: translatorB, url: '/path2' },
          ],
        },
      ] as unknown as Chapter[];
      mockChapterRepo.findAllByMangaId.mockResolvedValue(chapters);

      const result = await service.getChapterList(1, 1, 'en');

      expect(result).toHaveLength(1);
      expect(result[0].translationId).toBe(10);
    });

    it('should fallback to language match when no exact match', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      const chapters = [
        {
          id: 1,
          number: 1,
          title: 'Chapter 1',
          translations: [
            { id: 20, language, translator: translatorB, url: '/path' },
          ],
        },
      ] as unknown as Chapter[];
      mockChapterRepo.findAllByMangaId.mockResolvedValue(chapters);

      const result = await service.getChapterList(1, 1, 'en');

      expect(result[0].translationId).toBe(20);
    });

    it('should return null when no translation matches', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      const chapters = [
        {
          id: 1,
          number: 1,
          title: 'Chapter 1',
          translations: [
            { id: 30, language: viLang, translator: translatorB, url: '/path' },
          ],
        },
      ] as unknown as Chapter[];
      mockChapterRepo.findAllByMangaId.mockResolvedValue(chapters);

      const result = await service.getChapterList(1, 1, 'en');

      expect(result[0].translationId).toBeNull();
    });

    it('should set isFirstChapter and isLatestChapter correctly for multiple chapters', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      const chapters = [
        { id: 1, number: 1, title: 'Ch 1', translations: [] },
        { id: 2, number: 2, title: 'Ch 2', translations: [] },
        { id: 3, number: 3, title: 'Ch 3', translations: [] },
      ] as unknown as Chapter[];
      mockChapterRepo.findAllByMangaId.mockResolvedValue(chapters);

      const result = await service.getChapterList(1, 1, 'en');

      expect(result[0].isFirstChapter).toBe(true);
      expect(result[0].isLatestChapter).toBe(false);
      expect(result[1].isFirstChapter).toBe(false);
      expect(result[1].isLatestChapter).toBe(false);
      expect(result[2].isFirstChapter).toBe(false);
      expect(result[2].isLatestChapter).toBe(true);
    });

    it('should set both flags to true for a single chapter', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      const chapters = [
        { id: 1, number: 1, title: 'Ch 1', translations: [] },
      ] as unknown as Chapter[];
      mockChapterRepo.findAllByMangaId.mockResolvedValue(chapters);

      const result = await service.getChapterList(1, 1, 'en');

      expect(result[0].isFirstChapter).toBe(true);
      expect(result[0].isLatestChapter).toBe(true);
    });

    it('should return empty array when manga has no chapters', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      mockChapterRepo.findAllByMangaId.mockResolvedValue([]);

      const result = await service.getChapterList(1, 1, 'en');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(null);

      await expect(service.getChapterList(999, 1, 'en')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
```

- [ ] **Run tests to verify**

Run: `cd backend && npx jest --no-coverage --testPathPattern="chapter.service.spec"`

Expected: All tests PASS

---

### Task 5: Add controller endpoint

**Related skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Modify: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Add import for `ReaderChapterItem`**

```typescript
import { UpdateTranslationDto, ReaderChapterItem } from 'src/modules/manga/dto/translation.dto';
```

- [ ] **Add endpoint method**

Before the closing `}` of the class, add:

```typescript
  @Get('reader/chapters')
  getReaderChapters(
    @Query('mangaId', ParseIntPipe) mangaId: number,
    @Query('translatorId', ParseIntPipe) translatorId: number,
    @Query('language') language: string,
  ): Promise<ReaderChapterItem[]> {
    return this.chapterService.getChapterList(mangaId, translatorId, language);
  }
```

- [ ] **Add `getChapterList` to ChapterService mock in controller spec**

In `manga.controller.spec.ts`, update the `ChapterService` mock provider to include:

```typescript
          useValue: {
            create: jest.fn(),
            getChapterList: jest.fn(),
          },
```

- [ ] **Add controller test**

After the `createChapter` describe block in `manga.controller.spec.ts`, add:

```typescript
  describe('getReaderChapters', () => {
    it('should call ChapterService.getChapterList with correct params', async () => {
      const expected = [
        { chapterId: 1, title: 'Ch 1', translationId: 10, isFirstChapter: true, isLatestChapter: false },
      ];
      chapterService.getChapterList.mockResolvedValue(expected as any);

      const result = await controller.getReaderChapters(1, 1, 'en');

      expect(chapterService.getChapterList).toHaveBeenCalledWith(1, 1, 'en');
      expect(result).toEqual(expected);
    });

    it('should propagate NotFoundException from ChapterService', async () => {
      chapterService.getChapterList.mockRejectedValue(
        new NotFoundException('Manga #999 not found'),
      );

      await expect(
        controller.getReaderChapters(999, 1, 'en'),
      ).rejects.toThrow(NotFoundException);
    });
  });
```

- [ ] **Run all tests**

Run: `cd backend && npx jest --no-coverage`

Expected: All tests PASS

---

### Task 6: Build & verify

**Related skills:** `verification-before-completion`

**Files:**
- Run: build + test

- [ ] **TypeScript compilation check**

Run: `cd backend && npx tsc --noEmit`

Expected: No errors

- [ ] **Full test suite**

Run: `cd backend && npm run test`

Expected: All tests pass, 0 failures

---

### Task 7: Commit

- [ ] **Stage and commit**

```bash
git add backend/src/modules/manga/dto/translation.dto.ts
git add backend/src/modules/manga/repositories/chapter.repository.ts
git add backend/src/modules/manga/services/chapter.service.ts
git add backend/src/modules/manga/services/chapter.service.spec.ts
git add backend/src/modules/manga/manga.controller.ts
git add backend/src/modules/manga/manga.controller.spec.ts
git commit -m "feat: add GET /mangas/reader/chapters endpoint"
```
