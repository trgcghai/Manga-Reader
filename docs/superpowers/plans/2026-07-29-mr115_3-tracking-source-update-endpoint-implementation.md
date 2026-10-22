# MR115_3 — PATCH /tracking-sources/:id Update Tracking Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Add `PATCH /tracking-sources/:id` endpoint for updating `url`/`name` while preserving `latestChapterNumber`.

**Architecture:** New repository query methods for exclude-self duplicate checks → service orchestrates fetch/validate/update → controller handler.

**Process:** Strict TDD — failing test first, then implementation, then green.

**Related skills:** `nestjs-best-practices`, `nestjs-testing`, `vitest`

---

## Current State

- `UpdateTrackingSourceDto` already exists with `url?` / `name?` — no DTO changes needed
- Repository has `updateSource(id, data)` which returns `null` on not-found — good for 404
- `findSourceById` does NOT include `manga` relation — must be updated for duplicate checks

---

## File Structure

**Modified files:**
- `backend/src/modules/tracking/tracking.repository.ts`
- `backend/src/modules/tracking/tracking.service.ts`
- `backend/src/modules/tracking/tracking.controller.ts`
- `backend/src/modules/tracking/tracking.service.spec.ts`
- `backend/src/modules/tracking/tracking.controller.spec.ts`

---

### Task 1: Add query methods to repository

**Skill:** `nestjs-best-practices` (db-orm, arch-use-repository-pattern)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.repository.ts`

- [ ] **Step 1: Update `findSourceById` to include manga relation**

Change this method:
```typescript
  findSourceById = async (id: number): Promise<TrackingSource | null> => {
    return await this.sourceRepo.findOne({ where: { id } });
  };
```
to:
```typescript
  findSourceById = async (id: number): Promise<TrackingSource | null> => {
    return await this.sourceRepo.findOne({ where: { id }, relations: ['manga'] });
  };
```

- [ ] **Step 2: Add two exclude-self query methods**

Insert after `findSourceById`, before `createSource`:

```typescript
  findByMangaIdAndNameExcludingId = async (
    mangaId: number,
    name: string,
    excludeId: number,
  ): Promise<TrackingSource | null> => {
    return await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.mangaId = :mangaId', { mangaId })
      .andWhere('source.name = :name', { name })
      .andWhere('source.id != :excludeId', { excludeId })
      .getOne();
  };

  findByMangaIdAndUrlExcludingId = async (
    mangaId: number,
    url: string,
    excludeId: number,
  ): Promise<TrackingSource | null> => {
    return await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.mangaId = :mangaId', { mangaId })
      .andWhere('source.url = :url', { url })
      .andWhere('source.id != :excludeId', { excludeId })
      .getOne();
  };
```

- [ ] **Step 3: Run existing tests to confirm no regression**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: All tracking tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/tracking/tracking.repository.ts
git commit -m "feat: add exclude-self query methods to repository"
```

---

### Task 2 (TDD): Write failing service test → implement updateSource → pass

**Skill:** `nestjs-testing`, `vitest`

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Add new mock methods and updateSource test to service spec**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.spec.ts`.

**Change A:** Add these mocks to the `useValue` object for `TrackingRepository` in `beforeEach`:
```typescript
findSourceById: jest.fn(),
findByMangaIdAndNameExcludingId: jest.fn(),
findByMangaIdAndUrlExcludingId: jest.fn(),
updateSource: jest.fn(),
```

The full `useValue` should become:
```typescript
useValue: {
  findAllSources: jest.fn(),
  findAllSourcesPaginated: jest.fn(),
  createSource: jest.fn(),
  findSourceById: jest.fn(),
  findByMangaIdAndNameExcludingId: jest.fn(),
  findByMangaIdAndUrlExcludingId: jest.fn(),
  updateSource: jest.fn(),
},
```

**Change B:** Before the imports, add the eslint-disable for no-unsafe-call (needed for some chained mock calls):
The existing eslint-disable comment at the top covers `no-unsafe-assignment` and `no-unsafe-argument`. The test code will also need `@typescript-eslint/no-unsafe-member-access` disabled. Change line 1 to:
```typescript
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
```

Also need to import `UpdateTrackingSourceDto` at the top. The import from the DTO file currently only imports `CreateTrackingSourceDto, TrackingSourceResponseDto`. The service spec uses DTO types directly (inline objects), so no import change needed — the tests just pass inline objects matching the shape.

**Change C:** Add this `describe` block for `updateSource` inside the outer `describe('TrackingService')`, AFTER the `findAllSources` block and BEFORE the final closing `});`:

```typescript
  describe('updateSource', () => {
    const existingSource = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateDto = { name: 'MangaPlus' };

    it('should update name and return updated DTO', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndNameExcludingId.mockResolvedValue(null);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        name: 'MangaPlus',
      } as any);

      const result = await service.updateSource(1, updateDto);

      expect(result.name).toBe('MangaPlus');
      expect(result.latestChapterNumber).toBe('100');
      expect(trackingRepo.findSourceById).toHaveBeenCalledWith(1);
      expect(trackingRepo.findByMangaIdAndNameExcludingId).toHaveBeenCalledWith(1, 'MangaPlus', 1);
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, { name: 'MangaPlus' });
    });

    it('should update url and return updated DTO', async () => {
      const urlDto = { url: 'https://example.com/manga/one-piece-v2' };
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndUrlExcludingId.mockResolvedValue(null);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        url: 'https://example.com/manga/one-piece-v2',
      } as any);

      const result = await service.updateSource(1, urlDto);

      expect(result.url).toBe('https://example.com/manga/one-piece-v2');
      expect(trackingRepo.findByMangaIdAndUrlExcludingId).toHaveBeenCalledWith(
        1,
        'https://example.com/manga/one-piece-v2',
        1,
      );
    });

    it('should NOT reset latestChapterNumber', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndNameExcludingId.mockResolvedValue(null);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        name: 'MangaPlus',
        latestChapterNumber: '100',
      } as any);

      const result = await service.updateSource(1, updateDto);

      expect(result.latestChapterNumber).toBe('100');
    });

    it('should throw NotFoundException when source does not exist', async () => {
      trackingRepo.findSourceById.mockResolvedValue(null);

      await expect(service.updateSource(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, name) conflicts', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndNameExcludingId.mockResolvedValue({
        id: 2,
        manga: { id: 1 },
        name: 'MangaPlus',
      } as any);

      await expect(service.updateSource(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, url) conflicts', async () => {
      const urlDto = { url: 'https://example.com/manga/one-piece-v2' };
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndUrlExcludingId.mockResolvedValue({
        id: 2,
        manga: { id: 1 },
        url: 'https://example.com/manga/one-piece-v2',
      } as any);

      await expect(service.updateSource(1, urlDto)).rejects.toThrow(
        ConflictException,
      );
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should skip duplicate checks when name/url not provided', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.updateSource.mockResolvedValue(existingSource as any);

      await service.updateSource(1, {});

      expect(trackingRepo.findByMangaIdAndNameExcludingId).not.toHaveBeenCalled();
      expect(trackingRepo.findByMangaIdAndUrlExcludingId).not.toHaveBeenCalled();
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {});
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: FAIL — `updateSource` is not defined on `TrackingService`.

- [ ] **Step 3: Implement updateSource in service**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.ts`.

**Change A:** Add `UpdateTrackingSourceDto` to the import from DTO file:
```typescript
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
```

**Change B:** Add the method after `findAllSources`, before the closing `}`:

```typescript
  updateSource = async (
    id: number,
    dto: UpdateTrackingSourceDto,
  ): Promise<TrackingSourceResponseDto> => {
    const source = await this.trackingRepository.findSourceById(id);
    if (!source) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }

    if (dto.name) {
      const duplicateName = await this.trackingRepository.findByMangaIdAndNameExcludingId(
        source.manga.id,
        dto.name,
        id,
      );
      if (duplicateName) {
        throw new ConflictException(
          `Tracking source with name "${dto.name}" already exists for this manga`,
        );
      }
    }

    if (dto.url) {
      const duplicateUrl = await this.trackingRepository.findByMangaIdAndUrlExcludingId(
        source.manga.id,
        dto.url,
        id,
      );
      if (duplicateUrl) {
        throw new ConflictException(
          `Tracking source with URL "${dto.url}" already exists for this manga`,
        );
      }
    }

    const updated = await this.trackingRepository.updateSource(id, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.url ? { url: dto.url } : {}),
    });

    if (!updated) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }

    return {
      id: updated.id,
      mangaId: updated.manga.id,
      url: updated.url,
      name: updated.name,
      latestChapterNumber: updated.latestChapterNumber,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: PASS — 16 tests pass (9 existing + 7 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.service.ts
git commit -m "feat: add updateSource method to service with exclude-self duplicate checks"
```

---

### Task 3 (TDD): Write failing controller test → implement PATCH endpoint → pass

**Skill:** `nestjs-testing`, `vitest`, `nestjs-best-practices` (api-design)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Add updateSource mock and test to controller spec**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.spec.ts`.

**Change A:** Add `updateSource` to the mock `useValue` for `TrackingService`:
```typescript
useValue: {
  getStatus: jest.fn(),
  createSource: jest.fn(),
  findAllSources: jest.fn(),
  updateSource: jest.fn(),
},
```

**Change B:** Add this `describe` block for `update`, AFTER the `findAll` block and BEFORE the final closing `});`:

```typescript
  describe('update', () => {
    const updateDto = { name: 'MangaPlus' };

    it('should update and return updated source', async () => {
      service.updateSource.mockResolvedValue(mockResponse);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateSource).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when source not found', async () => {
      service.updateSource.mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on duplicate name', async () => {
      service.updateSource.mockRejectedValue(new ConflictException('name'));

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: FAIL — `update` is not defined on `TrackingController`.

- [ ] **Step 3: Implement PATCH endpoint in controller**

Read `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.ts`.

**Change A:** Add `Param`, `Patch` to `@nestjs/common` import:
```typescript
import { Controller, Get, Post, Body, Query, Param, Patch } from '@nestjs/common';
```

**Change B:** Add `UpdateTrackingSourceDto` to the import from DTO file:
```typescript
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
```

**Change C:** Add `@ApiParam` (if not already available) from `@nestjs/swagger`. Update the swagger import:
```typescript
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
```

**Change D:** Add the `update` method after `findAll`:

```typescript
  @Patch(':id')
  @ApiOperation({ summary: 'Update a tracking source' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: TrackingSourceResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTrackingSourceDto,
  ): Promise<TrackingSourceResponseDto> {
    return this.trackingService.updateSource(parseInt(id, 10), dto);
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: PASS — 11 tests pass (8 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.spec.ts backend/src/modules/tracking/tracking.controller.ts
git commit -m "feat: add PATCH /tracking-sources/:id endpoint with duplicate validation"
```

---

### Task 4: Run full test suite and lint

**Skill:** `nestjs-best-practices` (devops-use-logging)

- [ ] **Step 1: Run all tracking tests**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: All tracking tests pass.

- [ ] **Step 2: Run full test suite**

```bash
cd backend && npm run test
```

Expected: All test suites pass.

- [ ] **Step 3: Run lint**

```bash
cd backend && npm run lint
```

Expected: No new lint errors in tracking module files.

---

## Self-Review Checklist

1. **TDD compliance:** Tasks 2-3 follow red-green-refactor. Task 1 is infrastructure (repository queries) added before tests.
2. **Spec coverage:** 200 success (name update, url update, latestChapterNumber preserved), 404 not found, 409 duplicate name, 409 duplicate url, skip checks when field not provided — 7 service tests + 3 controller tests.
3. **`latestChapterNumber` preserved:** DTO has no `latestChapterNumber` field; `updateSource` in repo uses `Object.assign` so only provided fields change.
4. **Exclude-self logic:** Repository query methods use `source.id != :excludeId` to exclude current source from duplicate checks.
5. **Swagger:** `@ApiParam`, `@ApiOkResponse`, `@ApiOperation` added on the handler.
