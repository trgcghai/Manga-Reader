# MR115_2 — GET /tracking-sources List Tracking Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** Add a GET /tracking-sources endpoint with optional mangaId filter and pagination.

**Architecture:** New paginated repository method `findAllSourcesPaginated`, thin service delegate, controller `@Get()` handler. Follows existing `AuthorRepository.findAll` pagination pattern.

**Process:** Strict TDD — failing test first, then implementation, then green.

**Related skills:** `nestjs-best-practices`, `nestjs-testing`, `vitest`

---

## File Structure

**Modified files:**
- `backend/src/modules/tracking/tracking.repository.ts`
- `backend/src/modules/tracking/tracking.service.ts`
- `backend/src/modules/tracking/tracking.controller.ts`
- `backend/src/modules/tracking/tracking.service.spec.ts`
- `backend/src/modules/tracking/tracking.controller.spec.ts`

---

### Task 1 (TDD): Add findAllSourcesPaginated to repository

**Skill:** `nestjs-best-practices` (db-orm, arch-use-repository-pattern)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.repository.ts`

- [ ] **Step 1: Add the paginated method**

Add this method to `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.repository.ts` inside the `TrackingRepository` class, after the existing `findAllSources`:

```typescript
  findAllSourcesPaginated = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: TrackingSource[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.sourceRepo.createQueryBuilder('source');
    qb.leftJoinAndSelect('source.manga', 'manga');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    qb.orderBy('source.id', 'ASC');

    if (mangaId) {
      qb.where('source.mangaId = :mangaId', { mangaId });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };
```

- [ ] **Step 2: Run existing tests to confirm no regression**

```bash
cd backend && npx jest src/modules/tracking/ --verbose
```

Expected: 10 tests pass (no changes to behavior yet).

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/tracking/tracking.repository.ts
git commit -m "feat: add findAllSourcesPaginated method to repository"
```

---

### Task 2 (TDD): Write failing service test → implement findAllSources → pass

**Skill:** `nestjs-testing`, `vitest`

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Add failing test for findAllSources to the service spec**

Add this `describe` block inside the existing `describe('TrackingService')` in `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.spec.ts`, after the `createSource` block:

```typescript
  describe('findAllSources', () => {
    const mockSource = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return paginated sources', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [mockSource] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.findAllSources();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(undefined, 1, 20);
    });

    it('should filter by mangaId', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [mockSource] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      await service.findAllSources(1);

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should respect page and limit params', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [] as any,
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });

      const result = await service.findAllSources(undefined, 2, 5);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(undefined, 2, 5);
    });

    it('should return empty data when no results', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [] as any,
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await service.findAllSources();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
```

Also add `findAllSourcesPaginated` to the mock in `beforeEach`:
```typescript
useValue: {
  findAllSources: jest.fn(),
  findAllSourcesPaginated: jest.fn(),
  createSource: jest.fn(),
},
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: FAIL — `findAllSources` is not defined on `TrackingService`.

- [ ] **Step 3: Implement findAllSources in service**

Add this method to `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.service.ts` after `createSource`:

```typescript
  findAllSources = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
  ) => {
    return await this.trackingRepository.findAllSourcesPaginated(mangaId, page, limit);
  };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.service.spec.ts --verbose
```

Expected: PASS — 14 tests pass (10 existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.service.ts
git commit -m "feat: add findAllSources method to service with pagination"
```

---

### Task 3 (TDD): Write failing controller test → implement GET endpoint → pass

**Skill:** `nestjs-testing`, `vitest`, `nestjs-best-practices` (api-design)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Add failing test for GET endpoint to controller spec**

Add this `describe` block inside the existing `describe('TrackingController')` in `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.spec.ts`:

```typescript
  describe('findAll', () => {
    const paginatedResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };

    it('should return paginated sources', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult as any);

      const result = await controller.findAll();

      expect(result).toEqual(paginatedResult);
      expect(service.findAllSources).toHaveBeenCalledWith(undefined, 1, 20);
    });

    it('should pass mangaId filter', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult as any);

      await controller.findAll('1');

      expect(service.findAllSources).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should pass page and limit params', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult as any);

      await controller.findAll(undefined, '2', '5');

      expect(service.findAllSources).toHaveBeenCalledWith(undefined, 2, 5);
    });
  });
```

Also add `findAllSources` to the mock in `beforeEach`:
```typescript
useValue: {
  getStatus: jest.fn(),
  createSource: jest.fn(),
  findAllSources: jest.fn(),
},
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: FAIL — `findAll` is not defined on `TrackingController`.

- [ ] **Step 3: Implement GET endpoint in controller**

Add this method to `F:\Cntt\vibe\manga-reader\backend\src\modules\tracking\tracking.controller.ts` after `create`:

```typescript
  @Get()
  @ApiOperation({ summary: 'List tracking sources' })
  @ApiQuery({ name: 'mangaId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  findAll(
    @Query('mangaId') mangaId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.trackingService.findAllSources(
      mangaId ? parseInt(mangaId, 10) : undefined,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
```

Also add `Query` to the import from `@nestjs/common` and `ApiQuery` to the import from `@nestjs/swagger`.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend && npx jest src/modules/tracking/tracking.controller.spec.ts --verbose
```

Expected: PASS — 13 tests pass (10 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.spec.ts backend/src/modules/tracking/tracking.controller.ts
git commit -m "feat: add GET /tracking-sources endpoint with pagination and mangaId filter"
```

---

### Task 4: Run full test suite and lint

**Skill:** `nestjs-best-practices` (devops-use-logging)

**Files:** None

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

Expected: No new lint errors.

---

## Self-Review Checklist

1. **TDD compliance:** Tasks 2-3 follow red-green-refactor. Task 1 is infrastructure (repository) added before tests since it's a dependency.
2. **Spec coverage:** Paginated response shape (Task 1-2), mangaId filter (Task 2-3), page/limit params (Task 2-3), default limit 20 (Task 2-3), empty data (Task 2), Swagger docs (Task 3).
3. **Placeholder scan:** No TBD, TODO, or vague steps.
4. **Type consistency:** `findAllSourcesPaginated` in repo → `findAllSources` in service → `findAll` in controller. All method signatures and return types match.
