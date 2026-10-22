# MR115_5 — GET /tracking-config Get Tracking Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /tracking-config` endpoint that returns the tracking config, auto-creating the default config (`{ frequency: "daily", interval: 1, runAt: "00:00" }`) when none exists.

**Architecture:** Defaults live in a `DEFAULT_TRACKING_CONFIG` constant (shared with MR115_6). Service method `getConfig()` fetches via existing `findConfig()` and auto-creates via existing `upsertConfig()`. A new `TrackingConfigController` scoped to `tracking-config` exposes the GET handler; the module registers it.

**Tech Stack:** NestJS 11, TypeScript, TypeORM, @nestjs/swagger, Jest, supertest

**Process:** Strict TDD — failing test first, then implementation, then green. Commit after each task.

**Related skills:** `test-driven-development`, `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`, `verification-before-completion`

---

## Current State

- `TrackingConfigResponseDto` exists (`id`, `frequency`, `interval`, `runAt`, `updatedAt`) in `backend/src/modules/tracking/dto/tracking-config.dto.ts`
- Repository already has `findConfig()` (first row or null) and `upsertConfig(data)` (creates when none exists) — **no repository changes needed**
- `TrackingFrequency` enum: `DAILY = 'daily'`, `WEEKLY`, `MONTHLY`, `YEARLY`
- `TrackingController` is scoped to `tracking-sources` — config routes need a new controller
- The entity's `runAt` column has NO DB default (NOT NULL) — the service must pass `runAt` explicitly
- E2E spec exists at `backend/test/tracking.e2e-spec.ts` (from MR115_4) with a `FileServiceMockModule` workaround already in place

---

## File Structure

**Modified files:**
- `backend/src/modules/tracking/constants/tracking.constant.ts`
- `backend/src/modules/tracking/tracking.service.ts`
- `backend/src/modules/tracking/tracking.module.ts`
- `backend/src/modules/tracking/tracking.service.spec.ts`
- `backend/test/tracking.e2e-spec.ts`

**Created files:**
- `backend/src/modules/tracking/tracking-config.controller.ts`
- `backend/src/modules/tracking/tracking-config.controller.spec.ts`

---

### Task 1 (TDD): Add DEFAULT_TRACKING_CONFIG constant → write failing service test → implement getConfig → pass

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (service-layer)

**Files:**
- Modify: `backend/src/modules/tracking/constants/tracking.constant.ts`
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Add the DEFAULT_TRACKING_CONFIG constant**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\constants\tracking.constant.ts`.

Append after the enum:

```typescript
export const DEFAULT_TRACKING_CONFIG = {
  frequency: TrackingFrequency.DAILY,
  interval: 1,
  runAt: '00:00',
} as const;
```

- [ ] **Step 2: Add findConfig/upsertConfig mocks and getConfig tests to service spec**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.spec.ts`.

**Change A:** Add `findConfig: jest.fn(),` and `upsertConfig: jest.fn(),` to the `useValue` object for `TrackingRepository` in `beforeEach`. The full `useValue` should become:

```typescript
useValue: {
  findAllSources: jest.fn(),
  findAllSourcesPaginated: jest.fn(),
  createSource: jest.fn(),
  findSourceById: jest.fn(),
  findByMangaIdAndNameExcludingId: jest.fn(),
  findByMangaIdAndUrlExcludingId: jest.fn(),
  updateSource: jest.fn(),
  deleteSource: jest.fn(),
  findConfig: jest.fn(),
  upsertConfig: jest.fn(),
},
```

**Change B:** Add this `describe` block for `getConfig` inside the outer `describe('TrackingService')`, AFTER the `deleteSource` block and BEFORE the final closing `});`:

```typescript
  describe('getConfig', () => {
    const existingConfig = {
      id: 1,
      frequency: 'daily',
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('should return existing config mapped to DTO', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig as any);

      const result = await service.getConfig();

      expect(result).toEqual({
        id: 1,
        frequency: 'daily',
        interval: 1,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(trackingRepo.findConfig).toHaveBeenCalled();
      expect(trackingRepo.upsertConfig).not.toHaveBeenCalled();
    });

    it('should auto-create default config when none exists', async () => {
      trackingRepo.findConfig.mockResolvedValue(null);
      trackingRepo.upsertConfig.mockResolvedValue(existingConfig as any);

      const result = await service.getConfig();

      expect(result.frequency).toBe('daily');
      expect(result.interval).toBe(1);
      expect(result.runAt).toBe('00:00');
      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: 'daily',
        interval: 1,
        runAt: '00:00',
      });
    });
  });
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: FAIL — `getConfig` is not defined on `TrackingService`.

- [ ] **Step 4: Implement getConfig in service**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.ts`.

**Change A:** Add imports. The imports at the top should become:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TrackingRepository } from './tracking.repository';
import { MangaRepository } from '../manga/repositories/manga.repository';
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';
import { DEFAULT_TRACKING_CONFIG } from './constants/tracking.constant';
```

**Change B:** Add the method after `deleteSource`, before the closing `}` of the class:

```typescript
  getConfig = async (): Promise<TrackingConfigResponseDto> => {
    let config = await this.trackingRepository.findConfig();
    if (!config) {
      config = await this.trackingRepository.upsertConfig(
        DEFAULT_TRACKING_CONFIG,
      );
    }

    return {
      id: config.id,
      frequency: config.frequency,
      interval: config.interval,
      runAt: config.runAt,
      updatedAt: config.updatedAt.toISOString(),
    };
  };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: PASS — 20 tests pass (18 existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/tracking/constants/tracking.constant.ts backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.service.ts
git commit -m "feat: add DEFAULT_TRACKING_CONFIG constant and getConfig service method"
```

---

### Task 2 (TDD): Write failing controller test → create TrackingConfigController → register in module → pass

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (api-design, arch-use-modules)

**Files:**
- Create: `backend/src/modules/tracking/tracking-config.controller.spec.ts`
- Create: `backend/src/modules/tracking/tracking-config.controller.ts`
- Modify: `backend/src/modules/tracking/tracking.module.ts`

- [ ] **Step 1: Write the failing controller spec**

Create `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking-config.controller.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TrackingConfigController } from './tracking-config.controller';
import { TrackingService } from './tracking.service';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';

describe('TrackingConfigController', () => {
  let controller: TrackingConfigController;
  let service: jest.Mocked<TrackingService>;

  const mockResponse: TrackingConfigResponseDto = {
    id: 1,
    frequency: 'daily',
    interval: 1,
    runAt: '00:00',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingConfigController],
      providers: [
        {
          provide: TrackingService,
          useValue: {
            getConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingConfigController>(TrackingConfigController);
    service = module.get(TrackingService);
  });

  describe('getConfig', () => {
    it('should return tracking config DTO', async () => {
      service.getConfig.mockResolvedValue(mockResponse);

      const result = await controller.getConfig();

      expect(result).toEqual(mockResponse);
      expect(service.getConfig).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking-config.controller.spec.ts --verbose
```

Expected: FAIL — `Cannot find module './tracking-config.controller'` (or "not defined" when the file is created with a stub).

- [ ] **Step 3: Create the TrackingConfigController**

Create `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking-config.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';

@ApiTags('Tracking Config')
@Controller('tracking-config')
export class TrackingConfigController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  @ApiOperation({ summary: 'Get tracking config' })
  @ApiOkResponse({ type: TrackingConfigResponseDto })
  getConfig(): Promise<TrackingConfigResponseDto> {
    return this.trackingService.getConfig();
  }
}
```

- [ ] **Step 4: Register the controller in TrackingModule**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.module.ts`.

**Change A:** Add the import after the existing controller import:

```typescript
import { TrackingController } from './tracking.controller';
import { TrackingConfigController } from './tracking-config.controller';
```

**Change B:** Update the `controllers` array:

```typescript
  controllers: [TrackingController, TrackingConfigController],
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking-config.controller.spec.ts --verbose
```

Expected: PASS — 1 test passes.

- [ ] **Step 6: Run all tracking tests to confirm no regression**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: PASS — 32 tests pass (20 service + 12 source controller + 1 config controller).

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/tracking/tracking-config.controller.spec.ts backend/src/modules/tracking/tracking-config.controller.ts backend/src/modules/tracking/tracking.module.ts
git commit -m "feat: add GET /tracking-config endpoint with TrackingConfigController"
```

---

### Task 3: Extend e2e spec with GET /tracking-config coverage

**Skills:** `nestjs-testing`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/test/tracking.e2e-spec.ts`

- [ ] **Step 1: Add trackingConfigRepo and GET /tracking-config tests**

Read `F:\Cntt\vibe\manga-reader\backend\test\tracking.e2e-spec.ts`.

**Change A:** Add the repo variable next to the existing repo declarations:

```typescript
  let trackingSourceRepo: Repository<TrackingSource>;
  let trackingConfigRepo: Repository<TrackingConfig>;
  let mangaRepo: Repository<Manga>;
```

**Change B:** Add the repo initialization next to the existing one:

```typescript
    trackingSourceRepo = moduleFixture.get(getRepositoryToken(TrackingSource));
    trackingConfigRepo = moduleFixture.get(getRepositoryToken(TrackingConfig));
    mangaRepo = moduleFixture.get(getRepositoryToken(Manga));
```

**Change C:** Add this `describe` block at the end, AFTER the existing `DELETE /tracking-sources/:id` block and BEFORE the final closing `});`:

```typescript
  describe('GET /tracking-config', () => {
    it('returns 200 with config when one exists', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .get('/tracking-config')
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
      expect(res.body.runAt).toBe('02:00');
      expect(res.body.updatedAt).toBeDefined();
    });

    it('auto-creates and returns default config when none exists', async () => {
      const res = await request(app.getHttpServer())
        .get('/tracking-config')
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
      expect(res.body.runAt).toBe('00:00');
      expect(res.body.updatedAt).toBeDefined();
    });
  });
```

- [ ] **Step 2: Run the e2e spec**

Postgres on localhost:5433 (database `manga_reader_test`) must be reachable. If it is not running, start it first:

```bash
docker compose -f F:\Cntt\vibe\manga-reader\docker-compose.yml up -d postgres
```

Then:

```bash
cd backend && npm run test:e2e -- tracking.e2e-spec
```

Expected: PASS — 5 tests pass (3 existing + 2 new).

- [ ] **Step 3: Commit**

```bash
git add backend/test/tracking.e2e-spec.ts
git commit -m "test: extend tracking e2e spec with GET /tracking-config coverage"
```

---

### Task 4: Verify full suite, lint, build

**Skills:** `verification-before-completion`, `nestjs-best-practices`

- [ ] **Step 1: Run full test suite**

```bash
cd backend && npm run test
```

Expected: All test suites pass (347 existing + 3 new unit tests = 350, plus e2e separately).

- [ ] **Step 2: Run lint**

```bash
cd backend && npm run lint
```

Expected: No NEW lint errors in tracking module files. (17 pre-existing errors in unrelated files — http-exception.filter.spec.ts, response.interceptor.ts/.spec.ts, manga.repository.spec.ts, translator.repository.spec.ts — are known and out of scope.)

- [ ] **Step 3: Run build**

```bash
cd backend && npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Verify working tree state**

```bash
git status
```

Expected: Working tree clean (all changes committed in Tasks 1–3). If anything is dirty, report it — do not commit without instruction.

---

## Self-Review Checklist

1. **TDD compliance:** Tasks 1–2 follow red-green-refactor. Task 3 extends e2e coverage (post-implementation verification).
2. **Spec coverage:** 200 with existing config; auto-create default when none exists (asserts `upsertConfig` called with defaults); default values `frequency: 'daily'`, `interval: 1`, `runAt: '00:00'`; response shape matches `TrackingConfigResponseDto` (unit + e2e assert `id`, `frequency`, `interval`, `runAt`, `updatedAt`); Swagger via `@ApiOperation` + `@ApiOkResponse({ type: TrackingConfigResponseDto })`.
3. **Type consistency:** `getConfig` named identically across service, controller, and both specs; `DEFAULT_TRACKING_CONFIG` constant used by service and asserted in the service spec (`toHaveBeenCalledWith({ frequency: 'daily', interval: 1, runAt: '00:00' })` — `TrackingFrequency.DAILY` serializes to `'daily'`).
4. **Entity NOT NULL constraint:** `runAt` has no DB default; the constant guarantees the service always passes it on create.
5. **No placeholders:** every step contains concrete code or commands.
