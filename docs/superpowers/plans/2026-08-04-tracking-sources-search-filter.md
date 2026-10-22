# Tracking Sources Search Filter (MR125) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `search` query param to `GET /tracking-sources` that case-insensitively filters on manga title and source name, so the Tracking page can search server-side.

**Architecture:** Thread `search` through controller → service → repository. The service normalizes the term (trim, empty→undefined); the repository adds an `andWhere` clause `(LOWER(source.name) LIKE LOWER(:search) OR LOWER(manga.title) LIKE LOWER(:search))` with `%term%` params, ANDed with the existing `mangaId` filter. Mirrors the established manga list search pattern.

**Tech Stack:** NestJS, TypeORM (Postgres), Jest.

**Spec:** `docs/superpowers/specs/2026-08-04-tracking-sources-search-filter-design.md`
**Task:** `tasks/MR125.md`

---

## File Structure

- Modify: `backend/src/modules/tracking/tracking.controller.ts` — `@ApiQuery` + `@Query('search')`, forward to service
- Modify: `backend/src/modules/tracking/tracking.service.ts` — `search?: string` param, trim/normalize, forward
- Modify: `backend/src/modules/tracking/tracking.repository.ts` — `search?: string` param, `andWhere` search clause
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts` — new forward test + update existing assertions (extra `undefined` arg)
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts` — new forward/trim tests + update existing assertions
- Create: `backend/src/modules/tracking/tracking.repository.spec.ts` — mocked QueryBuilder tests

---

### Task 1: Write the failing repository test for the search filter

**Skills:** test-driven-development, nestjs-testing, javascript-typescript-jest

**Files:**
- Create: `backend/src/modules/tracking/tracking.repository.spec.ts`

- [ ] **Step 1: Create the spec file**

Create `backend/src/modules/tracking/tracking.repository.spec.ts` with:

```ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Repository } from 'typeorm';
import { TrackingRepository } from './tracking.repository';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';

describe('TrackingRepository', () => {
  let repo: TrackingRepository;
  let mockSourceRepo: jest.Mocked<Repository<TrackingSource>>;
  let mockConfigRepo: jest.Mocked<Repository<TrackingConfig>>;

  const createQueryBuilderMock = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  });

  beforeEach(() => {
    mockSourceRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<TrackingSource>>;
    mockConfigRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<TrackingConfig>>;
    repo = new TrackingRepository(mockSourceRepo, mockConfigRepo);
  });

  describe('findAllSourcesPaginated', () => {
    it('should filter by search term across source name and manga title', async () => {
      const mockData = [{ id: 1 }] as TrackingSource[];
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([mockData, 1]);
      mockSourceRepo.createQueryBuilder.mockReturnValue(qb as any);

      const result = await repo.findAllSourcesPaginated(undefined, 1, 20, 'naruto');

      expect(mockSourceRepo.createQueryBuilder).toHaveBeenCalledWith('source');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('source.manga', 'manga');
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(source.name) LIKE LOWER(:search)'),
        { search: '%naruto%' },
      );
      const whereSql = qb.andWhere.mock.calls[0][0];
      expect(whereSql).toContain('LOWER(manga.title)');
      expect(qb.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({ data: mockData, total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('should combine mangaId and search filters with AND', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockSourceRepo.createQueryBuilder.mockReturnValue(qb as any);

      await repo.findAllSourcesPaginated(24, 1, 20, 'naruto');

      expect(qb.where).toHaveBeenCalledWith('source.mangaId = :mangaId', { mangaId: 24 });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(source.name) LIKE LOWER(:search)'),
        { search: '%naruto%' },
      );
    });

    it('should not add a search clause when search is empty or missing', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockSourceRepo.createQueryBuilder.mockReturnValue(qb as any);

      await repo.findAllSourcesPaginated(undefined, 1, 20, undefined);
      await repo.findAllSourcesPaginated(undefined, 1, 20, '');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });
});
```

Note: `TrackingRepository`'s constructor takes `(sourceRepo, configRepo)` — both must be provided.

- [ ] **Step 2: Run the test and verify it fails**

Run: `cd backend && npm run test -- tracking.repository.spec`

Expected: FAIL — `findAllSourcesPaginated` does not accept a 4th argument and never calls `andWhere`, so the assertions fail (`TypeError`/`andWhere` not called).

---

### Task 2: Implement the repository search filter

**Skills:** nestjs-best-practices, test-driven-development

**Files:**
- Modify: `backend/src/modules/tracking/tracking.repository.ts`

- [ ] **Step 1: Extend `findAllSourcesPaginated`**

In `backend/src/modules/tracking/tracking.repository.ts`, change the signature and add the clause (replace lines 22-41, keeping the return block as-is):

```ts
  findAllSourcesPaginated = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
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

    if (search) {
      qb.andWhere(
        `(LOWER(source.name) LIKE LOWER(:search)
          OR LOWER(manga.title) LIKE LOWER(:search))`,
        { search: `%${search}%` },
      );
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

Key points: `andWhere` (NOT `where`) so the `mangaId` condition is preserved; the joined alias is `manga` (already joined by `leftJoinAndSelect` — no new join).

- [ ] **Step 2: Run the repository tests and verify they pass**

Run: `cd backend && npm run test -- tracking.repository.spec`

Expected: PASS — all 3 tests.

---

### Task 3: Write the failing service tests for search forwarding and normalization

**Skills:** test-driven-development, nestjs-testing, javascript-typescript-jest

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`

- [ ] **Step 1: Update existing assertions to the new signature**

In the `describe('findAllSources')` block of `backend/src/modules/tracking/tracking.service.spec.ts`, the existing `expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(...)` assertions gain a trailing `undefined` argument:

- `'should return paginated sources'`: `toHaveBeenCalledWith(undefined, 1, 20, undefined)`
- `'should filter by mangaId'`: `toHaveBeenCalledWith(1, 1, 20, undefined)`
- `'should respect page and limit params'`: `toHaveBeenCalledWith(undefined, 2, 5, undefined)`

- [ ] **Step 2: Add the new tests**

In the same describe block, after `'should return empty data when no results'`, add:

```ts
    it('should forward search term to repository', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await service.findAllSources(undefined, 1, 20, 'naruto');

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        'naruto',
      );
    });

    it('should trim the search term before forwarding', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await service.findAllSources(undefined, 1, 20, '  naruto  ');

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        'naruto',
      );
    });

    it('should forward undefined when search is blank', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await service.findAllSources(undefined, 1, 20, '   ');

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        undefined,
      );
    });
```

- [ ] **Step 3: Run the service tests and verify the new ones fail**

Run: `cd backend && npm run test -- tracking.service.spec`

Expected: FAIL — the 3 new tests (service does not accept `search` yet) AND the 3 updated assertion tests (called with fewer args than asserted).

---

### Task 4: Implement the service normalization and forwarding

**Skills:** nestjs-best-practices, test-driven-development

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Extend `findAllSources`**

In `backend/src/modules/tracking/tracking.service.ts`, replace the `findAllSources` method body (current lines ~79-93) with:

```ts
  findAllSources = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) => {
    const term = search?.trim() || undefined;
    const result = await this.trackingRepository.findAllSourcesPaginated(
      mangaId,
      page,
      limit,
      term,
    );

    return {
      ...result,
      data: result.data.map((source) =>
        this.toTrackingSourceResponseDto(source),
      ),
    };
  };
```

The DTO mapping from the previous fix stays untouched.

- [ ] **Step 2: Run the service tests and verify they pass**

Run: `cd backend && npm run test -- tracking.service.spec`

Expected: PASS — all tests including the 3 new ones.

---

### Task 5: Write the failing controller tests for search forwarding

**Skills:** test-driven-development, nestjs-testing, javascript-typescript-jest

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`

- [ ] **Step 1: Update existing assertions to the new signature**

In `backend/src/modules/tracking/tracking.controller.spec.ts`, the existing `expect(service.findAllSources).toHaveBeenCalledWith(...)` assertions gain a trailing `undefined`:

- `'should return paginated sources'`: `toHaveBeenCalledWith(undefined, 1, 20, undefined)`
- `'should pass mangaId filter'`: `toHaveBeenCalledWith(1, 1, 20, undefined)`
- `'should pass page and limit params'`: `toHaveBeenCalledWith(undefined, 2, 5, undefined)`

- [ ] **Step 2: Add the new test**

In the `describe('findAll')` block, after `'should pass page and limit params'`, add:

```ts
    it('should pass search param', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      await controller.findAll(undefined, '1', '20', 'naruto');

      expect(service.findAllSources).toHaveBeenCalledWith(undefined, 1, 20, 'naruto');
    });
```

- [ ] **Step 3: Run the controller tests and verify the new test fails**

Run: `cd backend && npm run test -- tracking.controller.spec`

Expected: FAIL — new test (controller does not forward `search`) and the 3 updated assertions (fewer args than asserted).

---

### Task 6: Implement the controller param

**Skills:** nestjs-best-practices, test-driven-development

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Add the `search` query param**

In `backend/src/modules/tracking/tracking.controller.ts`, update the `@Get()` handler (current lines 48-63):

```ts
  @Get()
  @ApiOperation({ summary: 'List tracking sources' })
  @ApiQuery({ name: 'mangaId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  findAll(
    @Query('mangaId') mangaId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
  ) {
    return this.trackingService.findAllSources(
      mangaId ? parseInt(mangaId, 10) : undefined,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
  }
```

- [ ] **Step 2: Run the controller tests and verify they pass**

Run: `cd backend && npm run test -- tracking.controller.spec`

Expected: PASS — all tests including the new one.

---

### Task 7: Full verification (tests, lint, live check)

**Skills:** verification-before-completion, nestjs-testing, systematic-debugging

**Files:** none (verification only)

- [ ] **Step 1: Run the entire backend suite**

Run: `cd backend && npm run test`

Expected: all suites pass (356 + new tests).

- [ ] **Step 2: Run the linter on touched files**

Run: `cd backend && npx eslint src/modules/tracking/tracking.controller.ts src/modules/tracking/tracking.service.ts src/modules/tracking/tracking.repository.ts src/modules/tracking/tracking.controller.spec.ts src/modules/tracking/tracking.service.spec.ts src/modules/tracking/tracking.repository.spec.ts`

Expected: no errors. (17 pre-existing lint errors in unrelated files are out of scope.)

- [ ] **Step 3: Live check against the running dev backend** (watch mode reloads automatically)

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/tracking-sources?search=one" | ConvertTo-Json -Depth 4
```

Expected: `data` contains only sources whose manga title or source name matches "one" (case-insensitive).

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/tracking-sources?search=one&mangaId=24" | ConvertTo-Json -Depth 4
```

Expected: both filters AND together.

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/tracking-sources" | ConvertTo-Json -Depth 4
```

Expected: full unfiltered list (no behavior change).

---

### Task 8: Commit

**Skills:** none

**Files:** the 4 modified + 1 created tracking files

- [ ] **Step 1: Stage and commit**

```bash
git add backend/src/modules/tracking/tracking.controller.ts backend/src/modules/tracking/tracking.service.ts backend/src/modules/tracking/tracking.repository.ts backend/src/modules/tracking/tracking.controller.spec.ts backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.repository.spec.ts
git commit -m "feat: add search filter to tracking sources list"
```

(Only commit when the user has approved the implementation result.)
