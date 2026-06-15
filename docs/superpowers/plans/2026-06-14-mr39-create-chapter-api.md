# MR39: Create Chapter API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /mangas/:mangaId/chapter` endpoint that creates a Chapter + Translation (or reuses existing chapter by number).

**Architecture:** `ChapterService` orchestrates create-or-reuse logic. `ChapterRepository` and `TranslationRepository` wrap TypeORM. Endpoint lives on `MangaController`.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, class-validator, Jest

---

## File Structure

### New Files (7)
| File | Responsibility |
|------|---------------|
| `backend/src/modules/manga/dto/chapter.dto.ts` | CreateChapterDto validation |
| `backend/src/modules/manga/chapter.repository.ts` | `findByMangaAndNumber()`, `create()` |
| `backend/src/modules/manga/translation.repository.ts` | `findByChapterAndLanguageAndTranslator()`, `create()` |
| `backend/src/modules/manga/services/chapter.service.ts` | Business logic: validate, create-or-reuse |
| `backend/src/modules/manga/chapter.repository.spec.ts` | Unit tests for ChapterRepository |
| `backend/src/modules/manga/translation.repository.spec.ts` | Unit tests for TranslationRepository |
| `backend/src/modules/manga/services/chapter.service.spec.ts` | Whitebox tests for ChapterService |

### Modified Files (5)
| File | Change |
|------|--------|
| `backend/src/modules/language/language.repository.ts` | Add `findOneById()` |
| `backend/src/modules/language/language.service.ts` | Add `findOne()` |
| `backend/src/modules/manga/manga.module.ts` | Import `LanguageModule`, `TranslatorModule`; provide new classes |
| `backend/src/modules/manga/manga.controller.ts` | Add `POST :mangaId/chapter` |
| `backend/src/modules/manga/manga.controller.spec.ts` | Add endpoint tests |

---

### Task 1: Add findOneById to LanguageRepository

**Skills:** `nestjs-best-practices`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/src/modules/language/language.repository.ts`

- [ ] **Step 1: Add findOneById method**

Edit `backend/src/modules/language/language.repository.ts`. After `findAll`, add:

```typescript
  findOneById = async (id: number): Promise<Language | null> => {
    return await this.repo.findOne({ where: { id } });
  };
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Commit**

```
git add backend/src/modules/language/language.repository.ts
git commit -m "feat(language): add findOneById to LanguageRepository"
```

---

### Task 2: Add findOne to LanguageService

**Skills:** `nestjs-best-practices`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/src/modules/language/language.service.ts`

- [ ] **Step 1: Add findOne method**

Edit `backend/src/modules/language/language.service.ts`. After `findAll`, add:

```typescript
  findOne = async (id: number) => {
    const language = await this.languageRepository.findOneById(id);
    if (!language) {
      throw new NotFoundException('Language with ID ' + id + ' not found');
    }
    return language;
  };
```

Import `NotFoundException` at the top if not already there.

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Commit**

```
git add backend/src/modules/language/language.service.ts
git commit -m "feat(language): add findOne to LanguageService"
```

---

### Task 3: Create ChapterRepository

**Skills:** `nestjs-best-practices`, `javascript-typescript-jest`, `test-driven-development`

**Files:**
- Create: `backend/src/modules/manga/chapter.repository.ts`
- Create: `backend/src/modules/manga/chapter.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/manga/chapter.repository.spec.ts`:

```typescript
import { Repository } from 'typeorm';
import { ChapterRepository } from './chapter.repository';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';

describe('ChapterRepository', () => {
  let repo: ChapterRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    repo = new ChapterRepository(mockRepo as unknown as Repository<Chapter>);
    jest.clearAllMocks();
  });

  describe('findByMangaAndNumber', () => {
    it('should find chapter by manga ID and number', async () => {
      const expected = { id: 1, number: 5, title: 'Ch 5' } as Chapter;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findByMangaAndNumber(1, 5);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { manga: { id: 1 }, number: 5 },
        relations: ['translations', 'translations.language', 'translations.translator'],
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByMangaAndNumber(999, 99);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should save and return a new chapter', async () => {
      const data = { number: 1, title: 'New Chapter' } as Partial<Chapter>;
      const saved = { id: 1, ...data } as Chapter;
      mockRepo.save.mockResolvedValue(saved);
      const result = await repo.create(data);
      expect(mockRepo.save).toHaveBeenCalledWith(data);
      expect(result).toEqual(saved);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/manga/chapter.repository.spec.ts --no-coverage`

Expected: FAIL — cannot find module `./chapter.repository`

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/modules/manga/chapter.repository.ts`:

```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { Repository } from 'typeorm';

export class ChapterRepository {
  constructor(
    @InjectRepository(Chapter)
    private readonly repo: Repository<Chapter>,
  ) {}

  findByMangaAndNumber = async (
    mangaId: number,
    number: number,
  ): Promise<Chapter | null> => {
    return await this.repo.findOne({
      where: { manga: { id: mangaId }, number },
      relations: [
        'translations',
        'translations.language',
        'translations.translator',
      ],
    });
  };

  create = async (data: Partial<Chapter>): Promise<Chapter> => {
    return await this.repo.save(data);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/manga/chapter.repository.spec.ts --no-coverage`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```
git add backend/src/modules/manga/chapter.repository.ts backend/src/modules/manga/chapter.repository.spec.ts
git commit -m "feat(manga): add ChapterRepository"
```

---

### Task 4: Create TranslationRepository

**Skills:** `nestjs-best-practices`, `javascript-typescript-jest`, `test-driven-development`

**Files:**
- Create: `backend/src/modules/manga/translation.repository.ts`
- Create: `backend/src/modules/manga/translation.repository.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/manga/translation.repository.spec.ts`:

```typescript
import { Repository } from 'typeorm';
import { TranslationRepository } from './translation.repository';
import { Translation } from 'src/modules/manga/entities/translation.entity';

describe('TranslationRepository', () => {
  let repo: TranslationRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    repo = new TranslationRepository(mockRepo as unknown as Repository<Translation>);
    jest.clearAllMocks();
  });

  describe('findByChapterAndLanguageAndTranslator', () => {
    it('should find translation by chapter, language, and translator IDs', async () => {
      const expected = { id: 1, chapter: { id: 1 } } as Translation;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findByChapterAndLanguageAndTranslator(1, 2, 3);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: {
          chapter: { id: 1 },
          language: { id: 2 },
          translator: { id: 3 },
        },
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByChapterAndLanguageAndTranslator(999, 999, 999);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should save and return a new translation', async () => {
      const data = { folderPath: '/chapters/1' } as Partial<Translation>;
      const saved = { id: 1, ...data } as Translation;
      mockRepo.save.mockResolvedValue(saved);
      const result = await repo.create(data);
      expect(mockRepo.save).toHaveBeenCalledWith(data);
      expect(result).toEqual(saved);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/manga/translation.repository.spec.ts --no-coverage`

Expected: FAIL — cannot find module `./translation.repository`

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/modules/manga/translation.repository.ts`:

```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import { Repository } from 'typeorm';

export class TranslationRepository {
  constructor(
    @InjectRepository(Translation)
    private readonly repo: Repository<Translation>,
  ) {}

  findByChapterAndLanguageAndTranslator = async (
    chapterId: number,
    languageId: number,
    translatorId: number,
  ): Promise<Translation | null> => {
    return await this.repo.findOne({
      where: {
        chapter: { id: chapterId },
        language: { id: languageId },
        translator: { id: translatorId },
      },
    });
  };

  create = async (data: Partial<Translation>): Promise<Translation> => {
    return await this.repo.save(data);
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/manga/translation.repository.spec.ts --no-coverage`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```
git add backend/src/modules/manga/translation.repository.ts backend/src/modules/manga/translation.repository.spec.ts
git commit -m "feat(manga): add TranslationRepository"
```

---

### Task 5: Create CreateChapterDto

**Skills:** `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/manga/dto/chapter.dto.ts`

- [ ] **Step 1: Create the DTO file**

Create `backend/src/modules/manga/dto/chapter.dto.ts`:

```typescript
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChapterDto {
  @IsNumber()
  @Min(0)
  number: number;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNumber()
  languageId: number;

  @IsNumber()
  translatorId: number;

  @IsString()
  @MinLength(1)
  folderPath: string;
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Commit**

```
git add backend/src/modules/manga/dto/chapter.dto.ts
git commit -m "feat(manga): add CreateChapterDto"
```

---

### Task 6: Create ChapterService (core logic)

**Skills:** `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`, `test-driven-development`

**Files:**
- Create: `backend/src/modules/manga/services/chapter.service.ts`
- Create: `backend/src/modules/manga/services/chapter.service.spec.ts`

- [ ] **Step 1: Write the failing whitebox tests**

Create `backend/src/modules/manga/services/chapter.service.spec.ts`:

```typescript
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { ChapterRepository } from 'src/modules/manga/chapter.repository';
import { TranslationRepository } from 'src/modules/manga/translation.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import type { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';

describe('ChapterService', () => {
  let service: ChapterService;
  let mangaRepo: jest.Mocked<MangaRepository>;
  let languageService: jest.Mocked<LanguageService>;
  let translatorService: jest.Mocked<TranslatorService>;
  let chapterRepo: jest.Mocked<ChapterRepository>;
  let translationRepo: jest.Mocked<TranslationRepository>;

  const manga = {
    id: 1,
    title: 'Test Manga',
    chapters: [],
  } as unknown as Manga;

  const language = { id: 1, code: 'en', name: 'English' } as any;
  const translator = { id: 1, name: 'Translator A' } as any;

  const chapter = {
    id: 1,
    number: 5,
    title: 'Ch 5',
    manga,
    translations: [],
  } as unknown as Chapter;

  const translation = {
    id: 1,
    chapter,
    language,
    translator,
    folderPath: '/path',
  } as unknown as Translation;

  const dto: CreateChapterDto = {
    number: 5,
    title: 'Ch 5',
    releaseDate: '2024-01-15',
    note: 'Side story',
    languageId: 1,
    translatorId: 1,
    folderPath: '/chapters/5',
  };

  beforeEach(() => {
    mangaRepo = { findOneById: jest.fn() } as any;
    languageService = { findOne: jest.fn() } as any;
    translatorService = { findOne: jest.fn() } as any;
    chapterRepo = {
      findByMangaAndNumber: jest.fn(),
      create: jest.fn(),
    } as any;
    translationRepo = {
      findByChapterAndLanguageAndTranslator: jest.fn(),
      create: jest.fn(),
    } as any;

    service = new ChapterService(
      mangaRepo,
      languageService,
      translatorService,
      chapterRepo,
      translationRepo,
    );
  });

  it('should throw NotFoundException when manga does not exist', async () => {
    mangaRepo.findOneById.mockResolvedValue(null);
    await expect(service.create(999, dto)).rejects.toThrow(NotFoundException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when language does not exist', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockRejectedValue(new NotFoundException());
    await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when translator does not exist', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockRejectedValue(new NotFoundException());
    await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when translation already exists', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(chapter);
    translationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
      translation,
    );
    await expect(service.create(1, dto)).rejects.toThrow(ConflictException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should create only Translation when Chapter already exists', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(chapter);
    translationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
      null,
    );
    translationRepo.create.mockResolvedValue(translation);
    const result = await service.create(1, dto);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).toHaveBeenCalledWith({
      chapter,
      language,
      translator,
      folderPath: dto.folderPath,
    });
    expect(result).toEqual(chapter);
  });

  it('should create both Chapter and Translation when Chapter is new', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(null);
    chapterRepo.create.mockResolvedValue(chapter);
    translationRepo.create.mockResolvedValue(translation);
    const result = await service.create(1, dto);
    expect(chapterRepo.create).toHaveBeenCalledWith({
      manga,
      number: dto.number,
      title: dto.title,
      releaseDate: new Date(dto.releaseDate as string),
      note: dto.note ?? null,
    });
    expect(translationRepo.create).toHaveBeenCalledWith({
      chapter,
      language,
      translator,
      folderPath: dto.folderPath,
    });
    expect(result).toEqual(chapter);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/manga/services/chapter.service.spec.ts --no-coverage`

Expected: FAIL — cannot find module `./chapter.service`

- [ ] **Step 3: Write minimal implementation**

Create `backend/src/modules/manga/services/chapter.service.ts`:

```typescript
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { ChapterRepository } from 'src/modules/manga/chapter.repository';
import { TranslationRepository } from 'src/modules/manga/translation.repository';
import { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';

@Injectable()
export class ChapterService {
  constructor(
    private readonly mangaRepo: MangaRepository,
    private readonly languageService: LanguageService,
    private readonly translatorService: TranslatorService,
    private readonly chapterRepo: ChapterRepository,
    private readonly translationRepo: TranslationRepository,
  ) {}

  create = async (mangaId: number, dto: CreateChapterDto) => {
    const manga = await this.mangaRepo.findOneById(mangaId);
    if (!manga) {
      throw new NotFoundException('Manga #' + mangaId + ' not found');
    }

    let language: any;
    try {
      language = await this.languageService.findOne(dto.languageId);
    } catch {
      throw new BadRequestException(
        'Language #' + dto.languageId + ' not found',
      );
    }

    let translator: any;
    try {
      translator = await this.translatorService.findOne(dto.translatorId);
    } catch {
      throw new BadRequestException(
        'Translator #' + dto.translatorId + ' not found',
      );
    }

    const existingChapter = await this.chapterRepo.findByMangaAndNumber(
      mangaId,
      dto.number,
    );

    if (existingChapter) {
      const existingTranslation =
        await this.translationRepo.findByChapterAndLanguageAndTranslator(
          existingChapter.id,
          dto.languageId,
          dto.translatorId,
        );

      if (existingTranslation) {
        throw new ConflictException(
          'A translation for chapter #' +
            dto.number +
            ' with this language and translator already exists',
        );
      }

      await this.translationRepo.create({
        chapter: existingChapter,
        language,
        translator,
        folderPath: dto.folderPath,
      });

      return existingChapter;
    }

    const chapter = await this.chapterRepo.create({
      manga,
      number: dto.number,
      title: dto.title,
      releaseDate: dto.releaseDate ? new Date(dto.releaseDate) : null,
      note: dto.note ?? null,
    });

    await this.translationRepo.create({
      chapter,
      language,
      translator,
      folderPath: dto.folderPath,
    });

    return chapter;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/manga/services/chapter.service.spec.ts --no-coverage`

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```
git add backend/src/modules/manga/services/chapter.service.ts backend/src/modules/manga/services/chapter.service.spec.ts
git commit -m "feat(manga): add ChapterService with create-or-reuse logic"
```

---

### Task 7: Wire MangaModule

**Skills:** `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/manga/manga.module.ts`

- [ ] **Step 1: Update module**

Edit `backend/src/modules/manga/manga.module.ts`:

Add these imports at the top:
```typescript
import { ChapterService } from './services/chapter.service';
import { ChapterRepository } from './chapter.repository';
import { TranslationRepository } from './translation.repository';
import { LanguageModule } from 'src/modules/language/language.module';
import { TranslatorModule } from 'src/modules/translator/translator.module';
```

Update the `@Module` decorator:
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Manga, Chapter, Translation]),
    AuthorModule,
    GenreModule,
    LanguageModule,
    TranslatorModule,
  ],
  controllers: [MangaController],
  providers: [
    MangaService,
    MangaRepository,
    ImportMangaService,
    ChapterService,
    ChapterRepository,
    TranslationRepository,
  ],
  exports: [MangaRepository],
})
export class MangaModule {}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Run existing tests**

Run: `cd backend && npx jest --no-coverage`

Expected: All existing tests pass (no regressions)

- [ ] **Step 4: Commit**

```
git add backend/src/modules/manga/manga.module.ts
git commit -m "feat(manga): wire ChapterService, LanguageModule, TranslatorModule"
```

---

### Task 8: Add POST endpoint to MangaController

**Skills:** `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`, `test-driven-development`

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`

- [ ] **Step 1: Add the endpoint**

Edit `backend/src/modules/manga/manga.controller.ts`:

Add to existing imports:
```typescript
import { HttpCode, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { ChapterService } from './services/chapter.service';
import { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';
```

Inject `ChapterService` in constructor:
```typescript
  constructor(
    private readonly mangaService: MangaService,
    private readonly importMangaService: ImportMangaService,
    private readonly chapterService: ChapterService,
  ) {}
```

Add endpoint method before closing brace:
```typescript
  @Post(':mangaId/chapter')
  @HttpCode(HttpStatus.CREATED)
  createChapter(
    @Param('mangaId', ParseIntPipe) mangaId: number,
    @Body() dto: CreateChapterDto,
  ) {
    return this.chapterService.create(mangaId, dto);
  }
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Run controller tests**

Run: `cd backend && npx jest src/modules/manga/manga.controller.spec.ts --no-coverage`

Expected: PASS (existing tests still pass)

- [ ] **Step 4: Commit**

```
git add backend/src/modules/manga/manga.controller.ts
git commit -m "feat(manga): add POST :mangaId/chapter endpoint"
```

---

### Task 9: Run full test suite and verify

**Skills:** none (verification)

- [ ] **Step 1: Run all backend tests**

Run: `cd backend && npx jest --no-coverage`

Expected: All tests pass

- [ ] **Step 2: Run full build**

Run: `cd backend && npm run build`

Expected: Build succeeds

- [ ] **Step 3: Commit any final adjustments**

If needed:
```
git add -A
git commit -m "chore: final adjustments after MR39 implementation"
```
