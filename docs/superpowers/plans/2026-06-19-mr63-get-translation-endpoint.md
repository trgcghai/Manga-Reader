# MR63: GET /mangas/translations/:translationId Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `GET /mangas/translations/:translationId` endpoint that returns a single translation with its chapter and manga context.

**Architecture:** New `TranslationDetailResponse` DTO in `translation.dto.ts` → `TranslationService.findOne()` does lookup + 404 + DTO mapping → `MangaController` delegates via `@Get('translations/:translationId')`.

**Tech Stack:** NestJS, TypeORM, Jest

---

### Task 1: Add `TranslationDetailResponse` DTO

**Files:**
- Modify: `backend/src/modules/manga/dto/translation.dto.ts`

- [ ] **Step 1: Add `TranslationDetailResponse` class**

Add to `backend/src/modules/manga/dto/translation.dto.ts` after the existing `UpdateTranslationDto` class:

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
}
```

- [ ] **Step 2: Verify build still passes**

Run: `cd backend && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/manga/dto/translation.dto.ts
git commit -m "feat: add TranslationDetailResponse DTO"
```

---

### Task 2: Add `findOne` to TranslationService + tests

**Files:**
- Modify: `backend/src/modules/manga/services/translation.service.ts`
- Modify: `backend/src/modules/manga/services/translation.service.spec.ts`

- [ ] **Step 1: Write the failing service test**

Add a `describe('findOne', ...)` block inside the existing `describe('TranslationService', ...)` in `translation.service.spec.ts`, before the closing `});` of the outer describe.

```typescript
describe('findOne', () => {
  it('should return TranslationDetailResponse when translation exists', async () => {
    const found = {
      id: 1,
      url: '/path/to/file.cbz',
      note: 'v2',
      createdAt: new Date('2026-01-01'),
      language: { id: 1, code: 'en', name: 'English' },
      translator: { id: 1, name: 'Translator A' },
      chapter: {
        id: 5,
        number: 1,
        title: 'Chapter 1',
        manga: { id: 10, title: 'One Piece' },
      },
    } as unknown as Translation;
    mockTranslationRepo.findById.mockResolvedValue(found);

    const result = await service.findOne(1);

    expect(mockTranslationRepo.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      id: 1,
      url: '/path/to/file.cbz',
      note: 'v2',
      createdAt: '2026-01-01T00:00:00.000Z',
      language: { id: 1, code: 'en', name: 'English' },
      translator: { id: 1, name: 'Translator A' },
      chapter: {
        id: 5,
        number: 1,
        title: 'Chapter 1',
        manga: { id: 10, title: 'One Piece' },
      },
    });
  });

  it('should throw NotFoundException when translation does not exist', async () => {
    mockTranslationRepo.findById.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    expect(mockTranslationRepo.findById).toHaveBeenCalledWith(999);
  });
});
```

- [ ] **Step 2: Run service test to verify it fails**

Run: `cd backend && npx jest src/modules/manga/services/translation.service.spec.ts --no-coverage -t "findOne"`
Expected: FAIL — "service.findOne is not a function"

- [ ] **Step 3: Implement `findOne` in TranslationService**

Add to `backend/src/modules/manga/services/translation.service.ts` before the `update` method:

```typescript
import { TranslationDetailResponse } from 'src/modules/manga/dto/translation.dto';
```

Then add method after the constructor:

```typescript
findOne = async (translationId: number): Promise<TranslationDetailResponse> => {
  const translation = await this.translationRepo.findById(translationId);
  if (!translation) {
    throw new NotFoundException('Translation not found');
  }
  return {
    id: translation.id,
    url: translation.url,
    note: translation.note,
    createdAt: translation.createdAt.toISOString(),
    language: translation.language,
    translator: translation.translator,
    chapter: {
      id: translation.chapter.id,
      number: translation.chapter.number,
      title: translation.chapter.title,
      manga: {
        id: translation.chapter.manga.id,
        title: translation.chapter.manga.title,
      },
    },
  };
};
```

- [ ] **Step 4: Run service test to verify it passes**

Run: `cd backend && npx jest src/modules/manga/services/translation.service.spec.ts --no-coverage -t "findOne"`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/manga/services/translation.service.ts backend/src/modules/manga/services/translation.service.spec.ts
git commit -m "feat: add TranslationService.findOne()"
```

---

### Task 3: Add controller endpoint + tests

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Modify: `backend/src/modules/manga/manga.controller.spec.ts`

- [ ] **Step 1: Write the failing controller test**

Add `findOne: jest.fn()` to the `TranslationService` mock provider in the module config (inside the `useValue` object for `TranslationService`):

```typescript
{
  provide: TranslationService,
  useValue: {
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn(),
  },
},
```

Add a `describe('getTranslation', ...)` block in `manga.controller.spec.ts` before the final closing `});`:

```typescript
describe('getTranslation', () => {
  const mockResponse = {
    id: 1,
    url: '/path/to/file.cbz',
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    language: { id: 1, code: 'en', name: 'English' },
    translator: { id: 1, name: 'Translator A' },
    chapter: {
      id: 5,
      number: 1,
      title: 'Chapter 1',
      manga: { id: 10, title: 'One Piece' },
    },
  };

  it('should return translation when found', async () => {
    translationService.findOne.mockResolvedValue(mockResponse);

    const result = await controller.getTranslation(1);

    expect(translationService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockResponse);
  });

  it('should throw NotFoundException when translation not found', async () => {
    translationService.findOne.mockRejectedValue(
      new NotFoundException('Translation not found'),
    );

    await expect(controller.getTranslation(999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run controller test to verify it fails**

Run: `cd backend && npx jest src/modules/manga/manga.controller.spec.ts --no-coverage -t "getTranslation"`
Expected: FAIL — "controller.getTranslation is not a function"

- [ ] **Step 3: Implement the endpoint in MangaController**

Add `@Get('translations/:translationId')` endpoint in `manga.controller.ts` after the existing translation endpoints:

```typescript
@Get('translations/:translationId')
getTranslation(
  @Param('translationId', ParseIntPipe) translationId: number,
) {
  return this.translationService.findOne(translationId);
}
```

- [ ] **Step 4: Run controller test to verify it passes**

Run: `cd backend && npx jest src/modules/manga/manga.controller.spec.ts --no-coverage -t "getTranslation"`
Expected: PASS (2/2)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts backend/src/modules/manga/manga.controller.spec.ts
git commit -m "feat: add GET /mangas/translations/:translationId endpoint"
```

---

### Task 4: Full verification

- [ ] **Step 1: Run full test suite**

Run: `cd backend && npm test`
Expected: All tests green

- [ ] **Step 2: Run TypeScript check**

Run: `cd backend && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Run lint**

Run: `cd backend && npm run lint`
Expected: No lint errors

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: fix lint/type issues after MR63"
```
