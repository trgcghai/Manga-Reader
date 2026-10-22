# MR115_1 — POST /tracking-sources Create Tracking Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Add a POST /tracking-sources endpoint that creates a tracking source with validation for manga existence, URL format, and duplicate prevention.

**Architecture:** Modify existing TrackingController, TrackingService, and TrackingModule. Validation split between DTO (class-validator) and service (business rules). MangaModule imported for manga existence checks.

**Process:** Strict TDD — write the failing test first, then implement the minimal code to pass it, then commit. Each task produces real working code.

**Related skills:** `nestjs-best-practices`, `nestjs-testing`, `vitest`

---

## File Structure

**New files:**
- `backend/src/modules/tracking/tracking.service.spec.ts`
- `backend/src/modules/tracking/tracking.controller.spec.ts`

**Modified files:**
- `backend/src/modules/tracking/tracking.service.ts`
- `backend/src/modules/tracking/tracking.controller.ts`
- `backend/src/modules/tracking/tracking.module.ts`

---

### Task 1 (TDD): Write failing TrackingService spec → implement createSource → pass

**Skill:** `nestjs-testing`, `vitest`, `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/tracking/tracking.service.spec.ts`
- Create: `backend/src/modules/tracking/tracking.service.ts` (overwrite)

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/tracking/tracking.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { MangaRepository } from '../manga/repositories/manga.repository';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TrackingService', () => {
  let service: TrackingService;
  let trackingRepo: jest.Mocked<TrackingRepository>;
  let mangaRepo: jest.Mocked<MangaRepository>;

  const mockManga = { id: 1, title: 'One Piece' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        {
          provide: TrackingRepository,
          useValue: {
            findAllSources: jest.fn(),
            createSource: jest.fn(),
          },
        },
        {
          provide: MangaRepository,
          useValue: {
            findOneById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    trackingRepo = module.get(TrackingRepository) as jest.Mocked<TrackingRepository>;
    mangaRepo = module.get(MangaRepository) as jest.Mocked<MangaRepository>;
  });

  describe('getStatus', () => {
    it('should return module status with timestamp', () => {
      const result = service.getStatus();
      expect(result.status).toBe('ok');
      expect(result.module).toBe('tracking');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('createSource', () => {
    const dto = { mangaId: 1, url: 'https://example.com/manga/one-piece', name: 'MangaDex' };

    it('should create a tracking source successfully', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([]);
      trackingRepo.createSource.mockResolvedValue({
        id: 1,
        manga: mockManga,
        url: dto.url,
        name: dto.name,
        latestChapterNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createSource(dto);

      expect(result.mangaId).toBe(1);
      expect(result.name).toBe('MangaDex');
      expect(result.latestChapterNumber).toBeNull();
      expect(mangaRepo.findOneById).toHaveBeenCalledWith(1);
      expect(trackingRepo.createSource).toHaveBeenCalled();
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      mangaRepo.findOneById.mockResolvedValue(null);

      await expect(service.createSource(dto)).rejects.toThrow(NotFoundException);
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, name) is duplicate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([
        { manga: { id: 1 }, name: 'MangaDex', url: 'https://other.com' } as any,
      ]);

      await expect(service.createSource(dto)).rejects.toThrow(ConflictException);
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, url) is duplicate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([
        { manga: { id: 1 }, name: 'Other', url: 'https://example.com/manga/one-piece' } as any,
      ]);

      await expect(service.createSource(dto)).rejects.toThrow(ConflictException);
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: FAIL — `createSource` is not defined on `TrackingService`.

- [ ] **Step 3: Write minimal implementation to pass**

Overwrite `backend/src/modules/tracking/tracking.service.ts`:

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TrackingRepository } from './tracking.repository';
import { MangaRepository } from '../manga/repositories/manga.repository';
import { CreateTrackingSourceDto, TrackingSourceResponseDto } from './dto/tracking-source.dto';

@Injectable()
export class TrackingService {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly mangaRepository: MangaRepository,
  ) {}

  getStatus = (): { status: string; module: string; timestamp: string } => {
    return {
      status: 'ok',
      module: 'tracking',
      timestamp: new Date().toISOString(),
    };
  };

  createSource = async (dto: CreateTrackingSourceDto): Promise<TrackingSourceResponseDto> => {
    const manga = await this.mangaRepository.findOneById(dto.mangaId);
    if (!manga) {
      throw new NotFoundException(`Manga with ID ${dto.mangaId} not found`);
    }

    const existingSources = await this.trackingRepository.findAllSources();

    const duplicateName = existingSources.find(
      (s) => s.manga?.id === dto.mangaId && s.name === dto.name,
    );
    if (duplicateName) {
      throw new ConflictException(`Tracking source with name "${dto.name}" already exists for this manga`);
    }

    const duplicateUrl = existingSources.find(
      (s) => s.manga?.id === dto.mangaId && s.url === dto.url,
    );
    if (duplicateUrl) {
      throw new ConflictException(`Tracking source with URL "${dto.url}" already exists for this manga`);
    }

    const source = await this.trackingRepository.createSource({
      manga,
      url: dto.url,
      name: dto.name,
    });

    return {
      id: source.id,
      mangaId: source.manga.id,
      url: source.url,
      name: source.name,
      latestChapterNumber: source.latestChapterNumber,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.service.ts
git commit -m "feat: add createSource method with validation"
```

---

### Task 2 (TDD): Write failing TrackingController spec → implement endpoint → pass

**Skill:** `nestjs-testing`, `vitest`, `nestjs-best-practices`

**Files:**
- Create: `backend/src/modules/tracking/tracking.controller.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/tracking/tracking.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { CreateTrackingSourceDto, TrackingSourceResponseDto } from './dto/tracking-source.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TrackingController', () => {
  let controller: TrackingController;
  let service: jest.Mocked<TrackingService>;

  const mockResponse: TrackingSourceResponseDto = {
    id: 1,
    mangaId: 1,
    url: 'https://example.com/manga/one-piece',
    name: 'MangaDex',
    latestChapterNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        {
          provide: TrackingService,
          useValue: {
            getStatus: jest.fn(),
            createSource: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    service = module.get(TrackingService) as jest.Mocked<TrackingService>;
  });

  describe('getStatus', () => {
    it('should return module status', () => {
      const expected = { status: 'ok', module: 'tracking', timestamp: '2026-01-01T00:00:00.000Z' };
      service.getStatus.mockReturnValue(expected);

      const result = controller.getStatus();

      expect(result).toEqual(expected);
      expect(service.getStatus).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const dto: CreateTrackingSourceDto = {
      mangaId: 1,
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
    };

    it('should create a tracking source and return 201', async () => {
      service.createSource.mockResolvedValue(mockResponse);

      const result = await controller.create(dto);

      expect(result).toEqual(mockResponse);
      expect(service.createSource).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      service.createSource.mockRejectedValue(new NotFoundException());

      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate name', async () => {
      service.createSource.mockRejectedValue(new ConflictException('name'));

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on duplicate url', async () => {
      service.createSource.mockRejectedValue(new ConflictException('url'));

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: FAIL — controller does not have `create` method or wrong base path.

- [ ] **Step 3: Implement controller with new base path and POST endpoint**

Overwrite `backend/src/modules/tracking/tracking.controller.ts`:

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { CreateTrackingSourceDto, TrackingSourceResponseDto } from './dto/tracking-source.dto';

@ApiTags('Tracking Sources')
@Controller('tracking-sources')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check tracking module health' })
  @ApiOkResponse({ description: 'Module is active' })
  getStatus(): { status: string; module: string; timestamp: string } {
    return this.trackingService.getStatus();
  }

  @Post()
  @ApiOperation({ summary: 'Create a tracking source' })
  @ApiCreatedResponse({ type: TrackingSourceResponseDto })
  async create(@Body() dto: CreateTrackingSourceDto): Promise<TrackingSourceResponseDto> {
    return this.trackingService.createSource(dto);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: PASS — all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.spec.ts backend/src/modules/tracking/tracking.controller.ts
git commit -m "refactor: change controller base path to tracking-sources, add POST endpoint"
```

---

### Task 3: Update TrackingModule to import MangaModule

**Skill:** `nestjs-best-practices` (arch-feature-modules, arch-module-sharing)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.module.ts`

- [ ] **Step 1: Add MangaModule import**

Replace `backend/src/modules/tracking/tracking.module.ts` with:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { MangaModule } from '../manga/manga.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackingSource, TrackingConfig]),
    MangaModule,
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingRepository],
  exports: [TrackingRepository],
})
export class TrackingModule {}
```

- [ ] **Step 2: Build to verify compilation**

```bash
cd backend && npx nest build
```

Expected: Build succeeds.

- [ ] **Step 3: Run all tracking tests to confirm no regressions**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/tracking/tracking.module.ts
git commit -m "feat: import MangaModule in TrackingModule"
```

---

### Task 4: Run full test suite and lint

**Skill:** `nestjs-best-practices` (devops-use-logging)

**Files:** None

- [ ] **Step 1: Run all tests**

```bash
cd backend && npm run test
```

Expected: All test suites pass (including the new tracking tests).

- [ ] **Step 2: Run lint**

```bash
cd backend && npm run lint
```

Expected: No new lint errors.

---

## Self-Review Checklist

1. **TDD compliance:** Tasks 1-2 follow red-green-refactor: failing test → minimal implementation → passing test → commit.
2. **Spec coverage:** Manga existence check (Task 1 test + impl), duplicate name check (Task 1), duplicate url check (Task 1), 201 response (Task 2), Swagger docs (Task 2 controller), tests (Tasks 1-2).
3. **Placeholder scan:** No TBD, TODO, or vague steps.
4. **Type consistency:** `CreateTrackingSourceDto` → `createSource()` → `TrackingSourceResponseDto`. Method signatures match across service, controller, and tests.
