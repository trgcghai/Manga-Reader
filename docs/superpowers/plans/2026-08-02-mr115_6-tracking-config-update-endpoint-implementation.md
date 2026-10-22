# MR115_6 — PATCH /tracking-sources/config Update Tracking Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `PATCH /tracking-sources/config` endpoint that partially updates the single tracking config row (upsert semantics — auto-creates merged over defaults when none exists).

**Architecture:** Service `updateConfig(dto)` does read-modify-write: `findConfig()` → base = existing row or `DEFAULT_TRACKING_CONFIG` → merge `{ ...base, ...dto }` → `upsertConfig(merged)` → map to `TrackingConfigResponseDto`. Handler lives on the existing `TrackingController` (`@Patch('config')`), consistent with the MR115_5 controller-merge decision. All validation already exists in `UpdateTrackingConfigDto`.

**Tech Stack:** NestJS 11, TypeScript, TypeORM, @nestjs/swagger, class-validator, Jest, supertest

**Process:** Strict TDD — failing test first, then implementation, then green. Commit after each task.

**Related skills:** `test-driven-development`, `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`, `verification-before-completion`

---

## Current State

- `TrackingController` (`tracking.controller.ts`) already has `getConfig` at `@Get('config')`; `Patch`, `Body`, `ApiOkResponse`, `ApiOperation` are already imported. Missing: `ApiBody` (swagger) and `UpdateTrackingConfigDto` (dto import).
- `TrackingService` (`tracking.service.ts`) already has `getConfig`; imports `TrackingConfigResponseDto` and `DEFAULT_TRACKING_CONFIG`. Missing: `UpdateTrackingConfigDto` import and `updateConfig` method.
- `UpdateTrackingConfigDto` already exists in `dto/tracking-config.dto.ts` with all required validation (`@IsEnum(TrackingFrequency)`, `@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)`). **No DTO or entity or repository changes needed.**
- Repository has `findConfig()` and `upsertConfig(data)` — both sufficient.
- `TrackingConfig.runAt` column is NOT NULL with no DB default — partial auto-create without defaults-merge would 500; the service merge prevents this.
- `tracking.service.spec.ts`: 20 tests, `trackingRepo` mock object with `findConfig`/`upsertConfig` already stubbed; `getConfig` describe block ends at line 405.
- `tracking.controller.spec.ts`: 14 tests, service `useValue` has `getConfig: jest.fn()`; imports `TrackingConfigResponseDto` from `./dto/tracking-config.dto`.
- `test/tracking.e2e-spec.ts`: 5 tests; `trackingConfigRepo` already declared and initialized; `beforeEach` TRUNCATEs `tracking_config`; `FileServiceMockModule` workaround in place; global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

---

## File Structure

**Modified files (no new files):**
- `backend/src/modules/tracking/tracking.service.ts` — add `updateConfig`
- `backend/src/modules/tracking/tracking.service.spec.ts` — add `updateConfig` tests
- `backend/src/modules/tracking/tracking.controller.ts` — add `updateConfig` handler
- `backend/src/modules/tracking/tracking.controller.spec.ts` — add `updateConfig` tests
- `backend/test/tracking.e2e-spec.ts` — add `PATCH /tracking-sources/config` tests

---

### Task 1 (TDD): Add `updateConfig` to TrackingService

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (service-layer)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Write the failing service tests**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.spec.ts`.

Add this `describe` block AFTER the `getConfig` describe block (which ends at line 405 with `  });`) and BEFORE the final closing `});`:

```typescript
  describe('updateConfig', () => {
    const existingConfig = {
      id: 1,
      frequency: 'daily',
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('should preserve unspecified fields on partial update', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig as any);
      trackingRepo.upsertConfig.mockResolvedValue(existingConfig as any);

      const result = await service.updateConfig({ frequency: 'weekly' });

      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        id: 1,
        frequency: 'weekly',
        interval: 1,
        runAt: '00:00',
        updatedAt: existingConfig.updatedAt,
      });
      expect(result).toEqual({
        id: 1,
        frequency: 'weekly',
        interval: 1,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should auto-create merging over defaults when none exists', async () => {
      trackingRepo.findConfig.mockResolvedValue(null);
      trackingRepo.upsertConfig.mockResolvedValue(existingConfig as any);

      const result = await service.updateConfig({ runAt: '23:59' });

      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: 'daily',
        interval: 1,
        runAt: '23:59',
      });
      expect(result.runAt).toBe('23:59');
    });

    it('should map result to DTO with ISO updatedAt', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig as any);
      trackingRepo.upsertConfig.mockResolvedValue(existingConfig as any);

      const result = await service.updateConfig({ interval: 2 });

      expect(result).toEqual({
        id: 1,
        frequency: 'daily',
        interval: 2,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(trackingRepo.findConfig).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: FAIL — `updateConfig` is not a function on `TrackingService` (`TypeError: service.updateConfig is not a function`).

- [ ] **Step 3: Implement `updateConfig` in the service**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.ts`.

**Change A:** Update the tracking-config dto import (line 13). It becomes:

```typescript
import {
  UpdateTrackingConfigDto,
  TrackingConfigResponseDto,
} from './dto/tracking-config.dto';
```

**Change B:** Add the method after `getConfig` (after line 168), before the closing `}` of the class:

```typescript
  updateConfig = async (
    dto: UpdateTrackingConfigDto,
  ): Promise<TrackingConfigResponseDto> => {
    const current = await this.trackingRepository.findConfig();
    const base = current ?? DEFAULT_TRACKING_CONFIG;
    const merged = { ...base, ...dto };

    const config = await this.trackingRepository.upsertConfig(merged);

    return {
      id: config.id,
      frequency: config.frequency,
      interval: config.interval,
      runAt: config.runAt,
      updatedAt: config.updatedAt.toISOString(),
    };
  };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: PASS — 23 tests pass (20 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.ts backend/src/modules/tracking/tracking.service.spec.ts
git commit -m "feat: add updateConfig service method with partial-merge upsert"
```

---

### Task 2 (TDD): Add `PATCH /tracking-sources/config` handler to TrackingController

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (api-design, controllers-thin)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Write the failing controller tests**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.spec.ts`.

**Change A:** Update the dto import (line 9) to include `UpdateTrackingConfigDto`:

```typescript
import {
  UpdateTrackingConfigDto,
  TrackingConfigResponseDto,
} from './dto/tracking-config.dto';
```

**Change B:** Add `updateConfig: jest.fn(),` to the service `useValue` object (after line 38 `getConfig: jest.fn(),`):

```typescript
          useValue: {
            getStatus: jest.fn(),
            createSource: jest.fn(),
            findAllSources: jest.fn(),
            updateSource: jest.fn(),
            deleteSource: jest.fn(),
            getConfig: jest.fn(),
            updateConfig: jest.fn(),
          },
```

**Change C:** Add this `describe` block AFTER the `getConfig` describe block and BEFORE the closing `});` of the outer `describe('TrackingController')`:

```typescript
  describe('updateConfig', () => {
    const updateDto: UpdateTrackingConfigDto = {
      frequency: 'weekly',
    };

    const mockConfig: TrackingConfigResponseDto = {
      id: 1,
      frequency: 'weekly',
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date().toISOString(),
    };

    it('should call service.updateConfig with dto and return result', async () => {
      service.updateConfig.mockResolvedValue(mockConfig);

      const result = await controller.updateConfig(updateDto);

      expect(result).toEqual(mockConfig);
      expect(service.updateConfig).toHaveBeenCalledWith(updateDto);
    });

    it('should propagate service rejection', async () => {
      service.updateConfig.mockRejectedValue(new Error('boom'));

      await expect(controller.updateConfig(updateDto)).rejects.toThrow(
        'boom',
      );
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: FAIL — `updateConfig` is not a function on `TrackingController`.

- [ ] **Step 3: Implement the handler**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.ts`.

**Change A:** Add `ApiBody` to the `@nestjs/swagger` import block (alphabetical order):

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiNoContentResponse,
} from '@nestjs/swagger';
```

**Change B:** Update the dto import (line 28):

```typescript
import {
  UpdateTrackingConfigDto,
  TrackingConfigResponseDto,
} from './dto/tracking-config.dto';
```

**Change C:** Add the handler after `getConfig` (after line 93), before the closing `}` of the class:

```typescript
  @Patch('config')
  @ApiOperation({ summary: 'Update tracking config' })
  @ApiBody({ type: UpdateTrackingConfigDto })
  @ApiOkResponse({ type: TrackingConfigResponseDto })
  async updateConfig(
    @Body() dto: UpdateTrackingConfigDto,
  ): Promise<TrackingConfigResponseDto> {
    return this.trackingService.updateConfig(dto);
  }
```

- [ ] **Step 4: Run all tracking unit tests to verify no regression**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: PASS — 39 tests pass (34 existing + 5 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.ts backend/src/modules/tracking/tracking.controller.spec.ts
git commit -m "feat: add PATCH /tracking-sources/config endpoint"
```

---

### Task 3: Extend e2e spec with PATCH /tracking-sources/config coverage

**Skills:** `nestjs-testing`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/test/tracking.e2e-spec.ts`

- [ ] **Step 1: Add the PATCH tests**

Read `F:\Cntt\vibe\manga-reader\backend\test\tracking.e2e-spec.ts`.

Add this `describe` block at the END, AFTER the existing `GET /tracking-sources/config` block and BEFORE the final closing `});`:

```typescript
  describe('PATCH /tracking-sources/config', () => {
    it('updates frequency and returns updated config', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ frequency: 'weekly' })
        .expect(200);

      expect(res.body.frequency).toBe('weekly');
      expect(res.body.interval).toBe(1);
      expect(res.body.runAt).toBe('02:00');
      expect(res.body.updatedAt).toBeDefined();
    });

    it('updates interval and returns updated config', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ interval: 3 })
        .expect(200);

      expect(res.body.interval).toBe(3);
      expect(res.body.frequency).toBe('daily');
      expect(res.body.runAt).toBe('02:00');
    });

    it('updates runAt and returns updated config', async () => {
      await trackingConfigRepo.save({
        frequency: 'daily',
        interval: 1,
        runAt: '02:00',
      } as any);

      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '23:59' })
        .expect(200);

      expect(res.body.runAt).toBe('23:59');
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
    });

    it('returns 400 for invalid frequency', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ frequency: 'hourly' })
        .expect(400);
    });

    it('returns 400 for interval < 1', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ interval: 0 })
        .expect(400);
    });

    it('returns 400 for invalid runAt format', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '9:00' })
        .expect(400);
    });

    it('auto-creates config merged over defaults when none exists', async () => {
      const res = await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '23:59' })
        .expect(200);

      expect(res.body.runAt).toBe('23:59');
      expect(res.body.frequency).toBe('daily');
      expect(res.body.interval).toBe(1);
    });

    it('returns 400 for runAt 24:00', async () => {
      await request(app.getHttpServer())
        .patch('/tracking-sources/config')
        .send({ runAt: '24:00' })
        .expect(400);
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

Expected: PASS — 13 tests pass (5 existing + 8 new).

- [ ] **Step 3: Commit**

```bash
git add backend/test/tracking.e2e-spec.ts
git commit -m "test: extend tracking e2e spec with PATCH /tracking-sources/config coverage"
```

---

### Task 4: Verify full suite, lint, build

**Skills:** `verification-before-completion`, `nestjs-best-practices`

- [ ] **Step 1: Run full unit test suite**

```bash
cd backend && npm run test
```

Expected: All suites pass (350 existing + 5 new = 355 unit tests).

- [ ] **Step 2: Run lint on tracking files**

```bash
cd backend && npx eslint src/modules/tracking/ test/tracking.e2e-spec.ts
```

Expected: exit 0, no output. (The 17 pre-existing lint errors in unrelated files — http-exception.filter.spec.ts, response.interceptor.ts/.spec.ts, manga.repository.spec.ts, translator.repository.spec.ts — are known and out of scope.)

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

1. **TDD compliance:** Tasks 1–2 follow red-green-refactor (failing test → implementation → green → commit). Task 3 extends e2e coverage post-implementation.
2. **Spec coverage:** partial update preserves unspecified fields (service test 1, e2e tests 1–3); auto-create merged over defaults (service test 2, e2e test 7); DTO mapping with ISO `updatedAt` (service test 3); 400s for invalid frequency / interval < 1 / bad runAt (e2e tests 4–6, 8); valid `23:59` succeeds (service test 2, e2e tests 3 & 7); Swagger via `@ApiBody({ type: UpdateTrackingConfigDto })` + `@ApiOkResponse({ type: TrackingConfigResponseDto })` (Task 2, Step 3). Controller propagates rejections (controller test 2).
3. **Type consistency:** `updateConfig` named identically across service, controller, and all specs; `UpdateTrackingConfigDto` imported from `./dto/tracking-config.dto` everywhere; `DEFAULT_TRACKING_CONFIG` used as the auto-create base and asserted as `{ frequency: 'daily', interval: 1, runAt: '23:59' }` (`TrackingFrequency.DAILY` serializes to `'daily'`).
4. **Route consistency:** `PATCH /tracking-sources/config` everywhere (controller `@Patch('config')` under class route `tracking-sources`, e2e `.patch('/tracking-sources/config')`).
5. **Entity NOT NULL constraint:** `runAt` has no DB default; the merge over `DEFAULT_TRACKING_CONFIG` guarantees it is always present on auto-create.
6. **No placeholders:** every step contains concrete code or commands.
