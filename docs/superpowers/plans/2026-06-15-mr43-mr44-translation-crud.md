# MR43 & MR44: Translation Edit & Delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add update and delete endpoints for translations with ownership chain validation.

**Architecture:** New `TranslationService` with `PATCH` and `DELETE` routes at `/mangas/:mangaId/chapter/:chapterId/translations/:translationId`. Ownership validated through relations (translation → chapter → manga). Existing `MangaController` extended with two new routes. Frontend adds API functions + hooks following established patterns.

**Tech Stack:** NestJS, TypeORM, class-validator, @tanstack/react-query

---

### Task 1: Backend — add findById and update to TranslationRepository

**Skills:** `test-driven-development`, `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/translation.repository.ts`
- Test: `backend/src/modules/manga/translation.repository.spec.ts`

- [ ] **Step 1: Add tests for findById + update**

Read the existing test file, then add these describe blocks after the `create` block:

```typescript
describe('findById', () => {
  it('should find translation by id with relations', async () => {
    const expected = {
      id: 1,
      chapter: { id: 1, manga: { id: 1 } },
    } as unknown as Translation
    mockRepo.findOne.mockResolvedValue(expected)
    const result = await repo.findById(1)
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['chapter', 'chapter.manga'],
    })
    expect(result).toEqual(expected)
  })

  it('should return null when not found', async () => {
    mockRepo.findOne.mockResolvedValue(null)
    const result = await repo.findById(999)
    expect(result).toBeNull()
  })
})

describe('update', () => {
  it('should update and return the translation', async () => {
    const id = 1
    const data = { folderPath: '/new/path' }
    const updated = { id, folderPath: '/new/path', chapter: { id: 1 } } as Translation
    mockRepo.update = jest.fn().mockResolvedValue({ affected: 1 })
    mockRepo.findOne.mockResolvedValue(updated)
    const result = await repo.update(id, data)
    expect(mockRepo.update).toHaveBeenCalledWith(id, data)
    expect(result).toEqual(updated)
  })
})
```

Add `mockRepo.update = jest.fn()` to the `mockRepo` object in the top-level `beforeEach`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/translation.repository.spec.ts --no-coverage --verbose`

Expected: Tests for `findById` and `update` fail with "repo.findById is not a function" / "repo.update is not a function"

- [ ] **Step 3: Implement findById + update + delete methods**

```typescript
// backend/src/modules/manga/translation.repository.ts
// Add these after the `create` method:

findById = async (id: number): Promise<Translation | null> => {
  return await this.repo.findOne({
    where: { id },
    relations: ['chapter', 'chapter.manga'],
  })
}

update = async (id: number, data: Partial<Translation>): Promise<Translation> => {
  await this.repo.update(id, data)
  return await this.repo.findOne({ where: { id } })
}

delete = async (id: number): Promise<void> => {
  await this.repo.delete(id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/translation.repository.spec.ts --no-coverage --verbose`

Expected: All tests PASS (findByChapterAndLanguageAndTranslator, create, findById, update)

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/manga/translation.repository.ts backend/src/modules/manga/translation.repository.spec.ts
git commit -m "feat(backend): add findById, update, delete to TranslationRepository"
```

---

### Task 2: Backend — create UpdateTranslationDto

**Skills:** `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/manga/dto/translation.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
// backend/src/modules/manga/dto/translation.dto.ts
import {
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class UpdateTranslationDto {
  @IsOptional()
  @IsNumber()
  languageId?: number

  @IsOptional()
  @IsNumber()
  translatorId?: number

  @IsOptional()
  @IsString()
  @MinLength(1)
  folderPath?: string
}
```

- [ ] **Step 2: Build check**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/manga/dto/translation.dto.ts
git commit -m "feat(backend): add UpdateTranslationDto"
```

---

### Task 3: Backend — create TranslationService

**Skills:** `test-driven-development`, `nestjs-best-practices`, `nestjs-testing`

**Files:**
- Create: `backend/src/modules/manga/services/translation.service.ts`
- Create: `backend/src/modules/manga/services/translation.service.spec.ts`

- [ ] **Step 1: Read existing chapter.service.ts and chapter.service.spec.ts for patterns**

Read both files to understand the DI pattern, error handling, and test structure.

- [ ] **Step 2: Write the failing test file**

```typescript
// backend/src/modules/manga/services/translation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ConflictException } from '@nestjs/common'
import { TranslationService } from './translation.service'
import { TranslationRepository } from 'src/modules/manga/translation.repository'
import { LanguageService } from 'src/modules/language/language.service'
import { TranslatorService } from 'src/modules/translator/translator.service'
import { Translation } from 'src/modules/manga/entities/translation.entity'
import { Language } from 'src/modules/language/entities/language.entity'
import { Translator } from 'src/modules/translator/entities/translator.entity'
import type { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto'

describe('TranslationService', () => {
  let service: TranslationService

  const mockTranslationRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByChapterAndLanguageAndTranslator: jest.fn(),
  }

  const mockLanguageService = {
    findOne: jest.fn(),
  }

  const mockTranslatorService = {
    findOne: jest.fn(),
  }

  const language = { id: 1, code: 'en', name: 'English' } as Language
  const translator = { id: 1, name: 'Translator A' } as Translator

  const translation = {
    id: 1,
    folderPath: '/path',
    language,
    translator,
    chapter: { id: 5, manga: { id: 10 } },
  } as unknown as Translation

  const dto: UpdateTranslationDto = {
    languageId: 2,
    folderPath: '/new/path',
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: TranslationRepository, useValue: mockTranslationRepo },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: TranslatorService, useValue: mockTranslatorService },
      ],
    }).compile()

    service = module.get(TranslationService)
  })

  describe('update', () => {
    it('should throw NotFoundException when translation does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(null)
      await expect(service.update(10, 5, 999, dto)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when chapterId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      await expect(service.update(10, 99, 1, dto)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when mangaId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      await expect(service.update(99, 5, 1, dto)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when language does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      mockLanguageService.findOne.mockRejectedValue(new NotFoundException())
      await expect(service.update(10, 5, 1, dto)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when translator does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      mockLanguageService.findOne.mockResolvedValue(language)
      dto.translatorId = 99
      mockTranslatorService.findOne.mockRejectedValue(new NotFoundException())
      await expect(service.update(10, 5, 1, dto)).rejects.toThrow(NotFoundException)
    })

    it('should throw ConflictException when duplicate language+translator exists', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      mockLanguageService.findOne.mockResolvedValue(language)
      mockTranslatorService.findOne.mockResolvedValue(translator)
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        { id: 2 } as Translation,
      )
      await expect(service.update(10, 5, 1, dto)).rejects.toThrow(ConflictException)
    })

    it('should update and return translation when all validations pass', async () => {
      const updated = { ...translation, folderPath: '/new/path', language } as Translation
      mockTranslationRepo.findById.mockResolvedValue(translation)
      mockLanguageService.findOne.mockResolvedValue(language)
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(null)
      mockTranslationRepo.update.mockResolvedValue(updated)
      const result = await service.update(10, 5, 1, dto)
      expect(mockTranslationRepo.update).toHaveBeenCalledWith(1, {
        language,
        folderPath: '/new/path',
      })
      expect(result).toEqual(updated)
    })
  })

  describe('delete', () => {
    it('should throw NotFoundException when translation does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(null)
      await expect(service.delete(10, 5, 999)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when chapterId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      await expect(service.delete(10, 99, 1)).rejects.toThrow(NotFoundException)
    })

    it('should throw NotFoundException when mangaId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      await expect(service.delete(99, 5, 1)).rejects.toThrow(NotFoundException)
    })

    it('should delete when translation exists and ownership matches', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation)
      mockTranslationRepo.delete.mockResolvedValue(undefined)
      await service.delete(10, 5, 1)
      expect(mockTranslationRepo.delete).toHaveBeenCalledWith(1)
    })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/services/translation.service.spec.ts --no-coverage --verbose`

Expected: Tests fail with "Cannot find module" for translation.service

- [ ] **Step 4: Create TranslationService**

```typescript
// backend/src/modules/manga/services/translation.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { TranslationRepository } from 'src/modules/manga/translation.repository'
import { LanguageService } from 'src/modules/language/language.service'
import { TranslatorService } from 'src/modules/translator/translator.service'
import { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto'

@Injectable()
export class TranslationService {
  constructor(
    private readonly translationRepo: TranslationRepository,
    private readonly languageService: LanguageService,
    private readonly translatorService: TranslatorService,
  ) {}

  update = async (
    mangaId: number,
    chapterId: number,
    translationId: number,
    dto: UpdateTranslationDto,
  ) => {
    const translation = await this.translationRepo.findById(translationId)
    if (!translation) {
      throw new NotFoundException('Translation not found')
    }
    if (translation.chapter.id !== chapterId) {
      throw new NotFoundException('Translation not found')
    }
    if (translation.chapter.manga.id !== mangaId) {
      throw new NotFoundException('Translation not found')
    }

    const partial: Record<string, unknown> = {}

    if (dto.languageId !== undefined) {
      const language = await this.languageService.findOne(dto.languageId)
      partial.language = language
    }
    if (dto.translatorId !== undefined) {
      const translator = await this.translatorService.findOne(dto.translatorId)
      partial.translator = translator
    }
    if (dto.folderPath !== undefined) {
      partial.folderPath = dto.folderPath
    }

    if (dto.languageId !== undefined || dto.translatorId !== undefined) {
      const newLangId = dto.languageId ?? translation.language.id
      const newTransId = dto.translatorId ?? translation.translator.id
      const existing = await this.translationRepo.findByChapterAndLanguageAndTranslator(
        chapterId,
        newLangId,
        newTransId,
      )
      if (existing && existing.id !== translationId) {
        throw new ConflictException(
          'A translation with this language and translator already exists for this chapter',
        )
      }
    }

    return await this.translationRepo.update(translationId, partial)
  }

  delete = async (mangaId: number, chapterId: number, translationId: number) => {
    const translation = await this.translationRepo.findById(translationId)
    if (!translation) {
      throw new NotFoundException('Translation not found')
    }
    if (translation.chapter.id !== chapterId) {
      throw new NotFoundException('Translation not found')
    }
    if (translation.chapter.manga.id !== mangaId) {
      throw new NotFoundException('Translation not found')
    }

    await this.translationRepo.delete(translationId)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest src/modules/manga/services/translation.service.spec.ts --no-coverage --verbose`

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/manga/services/translation.service.ts backend/src/modules/manga/services/translation.service.spec.ts
git commit -m "feat(backend): add TranslationService with update and delete"
```

---

### Task 4: Backend — add controller routes + register module

**Skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`
- Modify: `backend/src/modules/manga/manga.module.ts`

- [ ] **Step 1: Add TranslationService import and injection to MangaController**

Add import at top:
```typescript
import { TranslationService } from './services/translation.service'
import { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto'
```

Add to constructor:
```typescript
private readonly translationService: TranslationService,
```

Add routes after `createChapter`:
```typescript
@Patch(':mangaId/chapter/:chapterId/translations/:translationId')
updateTranslation(
  @Param('mangaId', ParseIntPipe) mangaId: number,
  @Param('chapterId', ParseIntPipe) chapterId: number,
  @Param('translationId', ParseIntPipe) translationId: number,
  @Body() dto: UpdateTranslationDto,
) {
  return this.translationService.update(mangaId, chapterId, translationId, dto)
}

@Delete(':mangaId/chapter/:chapterId/translations/:translationId')
@HttpCode(HttpStatus.NO_CONTENT)
deleteTranslation(
  @Param('mangaId', ParseIntPipe) mangaId: number,
  @Param('chapterId', ParseIntPipe) chapterId: number,
  @Param('translationId', ParseIntPipe) translationId: number,
) {
  return this.translationService.delete(mangaId, chapterId, translationId)
}
```

- [ ] **Step 2: Register TranslationService in MangaModule**

Add import at top:
```typescript
import { TranslationService } from './services/translation.service'
```

Add to `providers` array:
```typescript
TranslationService,
```

- [ ] **Step 3: Build check**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 4: Run full test suite**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest --no-coverage`

Expected: All 245+ tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/manga/manga.controller.ts backend/src/modules/manga/manga.module.ts
git commit -m "feat(backend): add PATCH and DELETE routes for translations"
```

---

### Task 5: Frontend — add translation API functions

**Skills:** `tanstack-query-best-practices`

**Files:**
- Modify: `frontend/src/services/api/chapterApi.ts`

- [ ] **Step 1: Add UpdateTranslationPayload and API functions**

Add to `frontend/src/services/api/chapterApi.ts` (after `createChapter`):

```typescript
export interface UpdateTranslationPayload {
  languageId?: number
  translatorId?: number
  folderPath?: string
}

export async function updateTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
  payload: UpdateTranslationPayload,
): Promise<void> {
  await axiosInstance.patch(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
    payload,
  )
}

export async function deleteTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
): Promise<void> {
  await axiosInstance.delete(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
  )
}
```

- [ ] **Step 2: Build check**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api/chapterApi.ts
git commit -m "feat(frontend): add updateTranslation and deleteTranslation API functions"
```

---

### Task 6: Frontend — create translation hooks

**Skills:** `tanstack-query-best-practices`

**Files:**
- Create: `frontend/src/hooks/useTranslations.ts`

- [ ] **Step 1: Create useTranslations.ts**

```typescript
// frontend/src/hooks/useTranslations.ts
import {
  updateTranslation,
  deleteTranslation,
} from '#/services/api/chapterApi'
import type { UpdateTranslationPayload } from '#/services/api/chapterApi'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useUpdateTranslation(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      chapterId,
      translationId,
      data,
    }: {
      chapterId: number
      translationId: number
      data: UpdateTranslationPayload
    }) => updateTranslation(mangaId, chapterId, translationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Translation updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update translation',
      )
    },
  })
}

export function useDeleteTranslation(mangaId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      chapterId,
      translationId,
    }: {
      chapterId: number
      translationId: number
    }) => deleteTranslation(mangaId, chapterId, translationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Translation deleted')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete translation',
      )
    },
  })
}
```

- [ ] **Step 2: Build check**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`

Expected: Build compiles with no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useTranslations.ts
git commit -m "feat(frontend): add useUpdateTranslation and useDeleteTranslation hooks"
```

---

### Task 7: Final verification

**Skills:** `verification-before-completion`

**Files:**
- N/A

- [ ] **Step 1: Full backend test suite**

Run: `cd F:\Cntt\vibe\manga-reader\backend && npx jest --no-coverage`

Expected: All tests PASS

- [ ] **Step 2: Frontend build**

Run: `cd F:\Cntt\vibe\manga-reader\frontend && npm run build`

Expected: No errors

- [ ] **Step 3: Git status check**

Run: `cd F:\Cntt\vibe\manga-reader && git status`

Expected: Clean working directory
