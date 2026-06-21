# MR74: Prev/Next Translation Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `GET /mangas/translations/:id` to return `prevTranslationId` and `nextTranslationId` so the reader can build chapter navigation links.

**Architecture:** Two targeted `ChapterRepository.findAdjacent` queries using `LessThan`/`MoreThan` + `ORDER BY number DESC|ASC` + implicit `LIMIT 1`. The `TranslationService` applies a 3-step priority filter on the returned translations array to pick the best match.

**Tech Stack:** NestJS, TypeORM, Jest, TypeScript

**Related Skills:** `nestjs-best-practices`, `nestjs-testing`

---

### Task 1: Add `findAdjacent` to `ChapterRepository`

**Skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/repositories/chapter.repository.ts`
- Create: `backend/src/modules/manga/repositories/chapter.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/manga/repositories/chapter.repository.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { ChapterRepository } from './chapter.repository';

describe('ChapterRepository', () => {
  let repo: ChapterRepository;
  let ormRepo: jest.Mocked<Repository<Chapter>>;

  const mockChapter = {
    id: 4,
    number: 2,
    translations: [
      { id: 99, translator: { id: 1 }, language: { id: 1 } },
    ],
  } as unknown as Chapter;

  beforeEach(async () => {
    ormRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Chapter>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChapterRepository,
        { provide: getRepositoryToken(Chapter), useValue: ormRepo },
      ],
    }).compile();

    repo = module.get(ChapterRepository);
  });

  describe('findAdjacent', () => {
    it('should query prev chapter with LessThan and DESC order', async () => {
      ormRepo.findOne.mockResolvedValue(mockChapter);
      const result = await repo.findAdjacent(10, 3, 'prev');
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { manga: { id: 10 }, number: LessThan(3) },
        order: { number: 'DESC' },
        relations: ['translations', 'translations.language', 'translations.translator'],
      });
      expect(result).toEqual(mockChapter);
    });

    it('should query next chapter with MoreThan and ASC order', async () => {
      ormRepo.findOne.mockResolvedValue(mockChapter);
      const result = await repo.findAdjacent(10, 3, 'next');
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { manga: { id: 10 }, number: MoreThan(3) },
        order: { number: 'ASC' },
        relations: ['translations', 'translations.language', 'translations.translator'],
      });
      expect(result).toEqual(mockChapter);
    });

    it('should return null when no adjacent chapter exists', async () => {
      ormRepo.findOne.mockResolvedValue(null);
      const result = await repo.findAdjacent(10, 1, 'prev');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/repositories/chapter.repository.spec.ts --no-cache`
Expected: FAIL — `findAdjacent` not defined

- [ ] **Step 3: Implement `findAdjacent`**

Add to `backend/src/modules/manga/repositories/chapter.repository.ts`:

```typescript
import { LessThan, MoreThan } from 'typeorm';

// Add method inside ChapterRepository class:

findAdjacent = async (
  mangaId: number,
  currentNumber: number,
  direction: 'prev' | 'next',
): Promise<Chapter | null> => {
  const operator = direction === 'prev' ? LessThan : MoreThan;
  const order: 'DESC' | 'ASC' = direction === 'prev' ? 'DESC' : 'ASC';

  return await this.repo.findOne({
    where: { manga: { id: mangaId }, number: operator(currentNumber) },
    order: { number: order },
    relations: [
      'translations',
      'translations.language',
      'translations.translator',
    ],
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/repositories/chapter.repository.spec.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add backend/src/modules/manga/repositories/chapter.repository.ts backend/src/modules/manga/repositories/chapter.repository.spec.ts
git commit -m "feat: add ChapterRepository.findAdjacent with LessThan/MoreThan queries (MR74)"
```

---

### Task 2: Extend `TranslationDetailResponse` DTO

**Skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/dto/translation.dto.ts`

- [ ] **Step 1: Add `prevTranslationId` and `nextTranslationId` fields**

Edit `backend/src/modules/manga/dto/translation.dto.ts`:

```typescript
export class TranslationDetailResponse {
  id: number;
  url: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };
  prevTranslationId: number | null;
  nextTranslationId: number | null;
}
```

- [ ] **Step 2: Verify build still passes**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm run build`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add backend/src/modules/manga/dto/translation.dto.ts
git commit -m "feat: add prevTranslationId and nextTranslationId to TranslationDetailResponse (MR74)"
```

---

### Task 3: Update `TranslationService.findOne` with adjacent resolution logic

**Skills:** `nestjs-best-practices`, `nestjs-testing`

**Files:**
- Modify: `backend/src/modules/manga/services/translation.service.ts`
- Modify: `backend/src/modules/manga/services/translation.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Replace the `findOne` describe block in `backend/src/modules/manga/services/translation.service.spec.ts`:

```typescript
describe('findOne', () => {
    const baseTranslation = {
      id: 1,
      url: '/path/to/file.cbz',
      note: 'v2',
      createdAt: new Date('2026-01-01'),
      language: { id: 1, code: 'en', name: 'English' },
      translator: { id: 1, name: 'Translator A' },
      chapter: {
        id: 5,
        number: 3,
        title: 'Chapter 3',
        manga: { id: 10, title: 'One Piece' },
      },
    } as unknown as Translation;

    const exactTranslation = {
      id: 100,
      translator: { id: 1 },
      language: { id: 1 },
    } as unknown as Translation;

    const langFallbackTranslation = {
      id: 101,
      translator: { id: 2 },
      language: { id: 1 },
    } as unknown as Translation;

    const anyTranslation = {
      id: 102,
      translator: { id: 2 },
      language: { id: 2 },
    } as unknown as Translation;

    const chExact = { id: 4, translations: [exactTranslation] } as unknown as Chapter;
    const chLangFallback = { id: 4, translations: [langFallbackTranslation] } as unknown as Chapter;
    const chAny = { id: 4, translations: [anyTranslation] } as unknown as Chapter;
    const chEmpty = { id: 4, translations: [] } as unknown as Chapter;
    const chBothDirections = {
      id: 4,
      translations: [exactTranslation],
    } as unknown as Chapter;

    it('should return prevTranslationId and nextTranslationId as null when no adjacent chapters', async () => {
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent.mockResolvedValue(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBeNull();
      expect(result.nextTranslationId).toBeNull();
    });

    it('should pick exact match (same translator + same language) for prev chapter', async () => {
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chExact)   // prev
        .mockResolvedValueOnce(null);      // next

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(100);
      expect(result.nextTranslationId).toBeNull();
    });

    it('should fall back to same language when exact match not found', async () => {
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chLangFallback)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(101);
    });

    it('should fall back to any translation when no language match exists', async () => {
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chAny)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(102);
    });

    it('should return null when adjacent chapter has zero translations', async () => {
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chEmpty)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBeNull();
    });

    it('should resolve both prev and next when both exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chBothDirections)
        .mockResolvedValueOnce(chBothDirections);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(100);
      expect(result.nextTranslationId).toBe(100);
    });

    it('should throw NotFoundException when translation does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
```

Also import `Chapter` at the top of the test file:
```typescript
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
```

And add `mockChapterRepo` to the outer describe block's variables:
```typescript
const mockChapterRepo = {
  findAdjacent: jest.fn(),
};
```

Add `ChapterRepository` to the testing module providers:
```typescript
{ provide: ChapterRepository, import: ... }
```

Wait, the testing module currently uses:
```typescript
providers: [
  TranslationService,
  { provide: TranslationRepository, useValue: mockTranslationRepo },
  { provide: LanguageService, useValue: mockLanguageService },
  { provide: TranslatorService, useValue: mockTranslatorService },
  { provide: FileService, useValue: mockFileService },
],
```

Add:
```typescript
{ provide: ChapterRepository, useValue: mockChapterRepo },
```

And import `ChapterRepository`:
```typescript
import { ChapterRepository } from 'src/modules/manga/repositories/chapter.repository';
```

Also add `jest.resetAllMocks()` call for `mockChapterRepo` in `beforeEach`:
```typescript
jest.resetAllMocks();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/services/translation.service.spec.ts --no-cache -t "findOne"`
Expected: FAIL — `findOne` tests fail because service doesn't accept `ChapterRepository` yet

- [ ] **Step 3: Update `TranslationService.findOne` with adjacent resolution**

Edit `backend/src/modules/manga/services/translation.service.ts`:

Add to imports:
```typescript
import { ChapterRepository } from 'src/modules/manga/repositories/chapter.repository';
```

Add `chapterRepo` to constructor:
```typescript
constructor(
  private readonly translationRepo: TranslationRepository,
  private readonly chapterRepo: ChapterRepository,
  private readonly languageService: LanguageService,
  private readonly translatorService: TranslatorService,
  private readonly fileService: FileService,
) {}
```

Replace the `findOne` method:

```typescript
findOne = async (
  translationId: number,
): Promise<TranslationDetailResponse> => {
  const translation = await this.translationRepo.findById(translationId);
  if (!translation) {
    throw new NotFoundException('Translation not found');
  }

  const mangaId = translation.chapter.manga.id;
  const chapterNumber = translation.chapter.number;
  const translatorId = translation.translator.id;
  const languageId = translation.language.id;

  const resolveAdjacent = async (
    direction: 'prev' | 'next',
  ): Promise<number | null> => {
    const adjChapter = await this.chapterRepo.findAdjacent(
      mangaId,
      chapterNumber,
      direction,
    );
    if (!adjChapter) return null;

    const translations = adjChapter.translations ?? [];
    if (translations.length === 0) return null;

    const exact = translations.find(
      (t) =>
        t.translator.id === translatorId && t.language.id === languageId,
    );
    if (exact) return exact.id;

    const sameLang = translations.find(
      (t) => t.language.id === languageId,
    );
    if (sameLang) return sameLang.id;

    return translations[0].id;
  };

  const [prevTranslationId, nextTranslationId] = await Promise.all([
    resolveAdjacent('prev'),
    resolveAdjacent('next'),
  ]);

  return {
    id: translation.id,
    url: translation.url,
    note: translation.note ?? undefined,
    createdAt: translation.createdAt.toISOString(),
    language: translation.language,
    translator: translation.translator,
    chapter: {
      id: translation.chapter.id,
      number: translation.chapter.number,
      title: translation.chapter.title ?? undefined,
      manga: {
        id: translation.chapter.manga.id,
        title: translation.chapter.manga.title,
      },
    },
    prevTranslationId,
    nextTranslationId,
  };
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/services/translation.service.spec.ts --no-cache`
Expected: PASS (all tests including update, findOne, delete)

- [ ] **Step 5: Run full backend test suite**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm run test`
Expected: PASS (all module tests)

- [ ] **Step 6: Verify build passes**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm run build`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add backend/src/modules/manga/services/translation.service.ts backend/src/modules/manga/services/translation.service.spec.ts
git commit -m "feat: add prev/next translation resolution to TranslationService.findOne (MR74)"
```

---

### Task 4: Update Frontend Type

**Skills:** (none needed — trivial type change)

**Files:**
- Modify: `frontend/src/types/translation.ts`

- [ ] **Step 1: Add new fields to `TranslationDetailResponse`**

Edit `frontend/src/types/translation.ts`:

```typescript
export interface TranslationDetailResponse {
  id: number;
  url: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };
  prevTranslationId: number | null;
  nextTranslationId: number | null;
}
```

- [ ] **Step 2: Verify frontend build passes**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
cd F:\Cntt\vibe\manga-reader
git add frontend/src/types/translation.ts
git commit -m "feat: add prevTranslationId and nextTranslationId to frontend type (MR74)"
```
