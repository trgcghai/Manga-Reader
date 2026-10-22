# MR116 — Tracking Source Check Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three check endpoints (`POST /tracking-sources/:id/check`, `POST /tracking-sources/check-manga/:mangaId`, `POST /tracking-sources/check-all`) that fetch external source URLs, extract the latest chapter number via a configurable JSON path, compare it with the stored value, and persist it when newer.

**Architecture:** A `ChapterExtractor` interface with one implementation (`JsonPathExtractor`) reads the chapter number from the parsed response body (root `chapterNumber` by default, else a dot-notation `extractorPath` stored on the source). `TrackingService` gains a private `performSourceCheck` (HTTP GET → parse → extract → numeric/string comparison → persist) plus three public methods: single check (404/502/422 semantics), per-manga aggregate, and all-sources aggregate (always 200 with per-source `error` fields). `HttpService` from `@nestjs/axios` is injected with a 10s timeout.

**Tech Stack:** NestJS 11, TypeScript, TypeORM, @nestjs/axios + axios, @nestjs/swagger, class-validator, Jest.

**Process:** Strict TDD — failing test first, then implementation, then green. Commit after each task.

**Related skills:** `test-driven-development`, `nestjs-best-practices`, `nestjs-testing`, `javascript-typescript-jest`, `verification-before-completion`

---

## Current State

- `TrackingController` (`backend/src/modules/tracking/tracking.controller.ts`) has create/list/update/delete/config endpoints at `@Controller('tracking-sources')`; no `/api` prefix anywhere (no `setGlobalPrefix` in `main.ts`). Decorators already imported: `Post`, `ApiOperation`, `ApiOkResponse`, `ApiParam`; missing: `ApiNotFoundResponse`, `ApiBadGatewayResponse`, `ApiUnprocessableEntityResponse`.
- `TrackingService` (`backend/src/modules/tracking/tracking.service.ts`) has `createSource`/`findAllSources`/`updateSource`/`deleteSource`/`getConfig`/`updateConfig`; constructor injects `TrackingRepository` + `MangaRepository` only. `toTrackingSourceResponseDto` maps the entity (no `extractorPath` yet).
- `TrackingRepository` has `findSourceById` (loads `manga` relation — reusable for single checks), `findAllSourcesPaginated`, create/update/delete. **Missing:** a way to fetch all sources (or by mangaId) with the `manga` relation — required for aggregates.
- `TrackingSource` entity has id/manga/url/name/latestChapterNumber/timestamps. No `extractorPath`.
- DTOs (`dto/tracking-source.dto.ts`): create = `mangaId`, `url`, `name`; update = `url?`, `name?`; response has `latestChapterNumber: string | null` and full `manga` object.
- `tracking.service.spec.ts` (599 lines): mocks both repos; `mockManga`, `existingSource`, `mockSource` fixtures already defined (no `httpService` yet, no `extractorPath` on fixtures — fixtures are `as any` so they tolerate the new field).
- `tracking.controller.spec.ts` (240 lines): `service.useValue` mock lists every `TrackingService` method; `mockResponse` is **typed** `TrackingSourceResponseDto` without `extractorPath` → must be updated after the response DTO gains the field (strictNullChecks is on).
- `backend/package.json` — no axios/@nestjs/axios. Jest configured via package.json (`testRegex: .*\.spec\.ts$`, ts-jest, `moduleNameMapper: ^src/(.*)$ → <rootDir>/src/$1`).
- Backend tsconfig: `strictNullChecks: true`, `noImplicitAny: false`, target ES2023, `module: nodenext`.
- Check endpoints will NOT get e2e specs: they perform real outbound HTTP calls (non-deterministic in CI); unit coverage at service + controller level replaces it, consistent with the approved design.

## File Structure

**New files:**
- `backend/src/modules/tracking/extractors/chapter-extractor.interface.ts` — extractor contract
- `backend/src/modules/tracking/extractors/json-path-extractor.ts` — dot-notation (+ array index) navigation
- `backend/src/modules/tracking/extractors/json-path-extractor.spec.ts` — extractor unit tests

**Modified files:**
- `backend/package.json` — add `@nestjs/axios`, `axios`
- `backend/src/modules/tracking/tracking.module.ts` — register `HttpModule.register({ timeout: 10000 })`
- `backend/src/modules/tracking/entities/tracking-source.entity.ts` — add `extractorPath`
- `backend/src/modules/tracking/dto/tracking-source.dto.ts` — `extractorPath` on create/update/response DTOs
- `backend/src/modules/tracking/tracking.repository.ts` — `findAllSourcesForCheck`, `findByMangaIdForCheck`
- `backend/src/modules/tracking/tracking.service.ts` — check logic, `CheckResult`/`AggregateCheckResult` types, `HttpService` injection, extractorPath wiring
- `backend/src/modules/tracking/tracking.controller.ts` — three POST endpoints
- `backend/src/modules/tracking/tracking.service.spec.ts` — check + extractorPath tests
- `backend/src/modules/tracking/tracking.repository.spec.ts` — new query method tests
- `backend/src/modules/tracking/tracking.controller.spec.ts` — endpoint wiring tests + fixture updates

---

### Task 1: Install axios and register HttpModule

**Skills:** `nestjs-best-practices` (module registration), `verification-before-completion` (build check)

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/modules/tracking/tracking.module.ts`

- [ ] **Step 1: Install dependencies**

Run in `F:\Cntt\vibe\manga-reader\backend`:

```bash
npm install @nestjs/axios axios
```

Expected: package.json gains `"@nestjs/axios": "^4.x"` and `"axios": "^1.x"` (check `dependencies`).

- [ ] **Step 2: Register HttpModule**

Edit `backend/src/modules/tracking/tracking.module.ts` to:

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
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
    HttpModule.register({ timeout: 10000 }),
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingRepository],
  exports: [TrackingRepository],
})
export class TrackingModule {}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: `Build successful` (exit 0, no errors).

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/modules/tracking/tracking.module.ts
git commit -m "feat: add axios with HttpModule for tracking source checks"
```

---

### Task 2 (TDD): `extractorPath` data layer — entity, DTOs, service wiring

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (service-layer)

**Files:**
- Modify: `backend/src/modules/tracking/entities/tracking-source.entity.ts`
- Modify: `backend/src/modules/tracking/dto/tracking-source.dto.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`

- [ ] **Step 1: Add the entity column**

Edit `backend/src/modules/tracking/entities/tracking-source.entity.ts` — add after `latestChapterNumber`:

```typescript
  @Column({ nullable: true, default: null })
  extractorPath: string | null;
```

- [ ] **Step 2: Add `extractorPath` to DTOs**

Edit `backend/src/modules/tracking/dto/tracking-source.dto.ts`:

In `CreateTrackingSourceDto`, after the `name` property:

```typescript
  @ApiPropertyOptional({
    example: 'data.chapters[0].number',
    description: 'Dot-notation JSON path to the latest chapter number',
  })
  @IsOptional()
  @IsString()
  extractorPath?: string;
```

In `UpdateTrackingSourceDto`, after the `name` property (same body):

```typescript
  @ApiPropertyOptional({
    example: 'data.chapters[0].number',
    description: 'Dot-notation JSON path to the latest chapter number',
  })
  @IsOptional()
  @IsString()
  extractorPath?: string;
```

In `TrackingSourceResponseDto`, after `latestChapterNumber`:

```typescript
  @ApiPropertyOptional()
  extractorPath: string | null;
```

- [ ] **Step 3: Write the failing service tests for the wiring**

Edit `backend/src/modules/tracking/tracking.service.spec.ts`:

(a) Update the existing "should map each source to a response DTO including mangaId" expectation (findAllSources describe) — the full `toEqual` literal must gain the new field:

```typescript
      expect(result.data[0]).toEqual({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'MangaDex',
        latestChapterNumber: null,
        extractorPath: null,
        createdAt: mockSource.createdAt.toISOString(),
        updatedAt: mockSource.updatedAt.toISOString(),
        manga: { id: 1, title: 'One Piece' },
      });
```

(b) Add this test at the end of the `createSource` describe block (before its closing `});`):

```typescript
    it('should persist extractorPath when provided', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([]);
      trackingRepo.createSource.mockResolvedValue({
        id: 1,
        manga: mockManga,
        url: dto.url,
        name: dto.name,
        extractorPath: 'data.chapters[0].number',
        latestChapterNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createSource({
        ...dto,
        extractorPath: 'data.chapters[0].number',
      });

      expect(trackingRepo.createSource).toHaveBeenCalledWith(
        expect.objectContaining({
          manga: mockManga,
          url: dto.url,
          name: dto.name,
          extractorPath: 'data.chapters[0].number',
        }),
      );
      expect(result.extractorPath).toBe('data.chapters[0].number');
    });
```

(c) Add this test at the end of the `updateSource` describe block:

```typescript
    it('should update extractorPath and include it in the response DTO', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        extractorPath: 'latest.number',
      } as any);

      const result = await service.updateSource(1, {
        extractorPath: 'latest.number',
      });

      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        extractorPath: 'latest.number',
      });
      expect(result.extractorPath).toBe('latest.number');
    });
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx jest src/modules/tracking/tracking.service.spec.ts`
Expected: FAIL — the two new tests fail (createSource never receives `extractorPath`; response DTO lacks the property; the findAll `toEqual` mismatch), plus a TS error from the missing `extractorPath` on the DTO mapping.

- [ ] **Step 5: Wire `extractorPath` through the service**

Edit `backend/src/modules/tracking/tracking.service.ts`:

In `toTrackingSourceResponseDto`, add after `latestChapterNumber`:

```typescript
      extractorPath: source.extractorPath ?? null,
```

In `createSource`, change the `createSource` call to:

```typescript
    const source = await this.trackingRepository.createSource({
      manga,
      url: dto.url,
      name: dto.name,
      ...(dto.extractorPath !== undefined
        ? { extractorPath: dto.extractorPath }
        : {}),
    });
```

In `updateSource`, change the `updateSource` call to:

```typescript
    const updated = await this.trackingRepository.updateSource(id, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.url ? { url: dto.url } : {}),
      ...(dto.extractorPath !== undefined
        ? { extractorPath: dto.extractorPath }
        : {}),
    });
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/modules/tracking/tracking.service.spec.ts`
Expected: PASS (all tests, including the updated findAll expectation).

- [ ] **Step 7: Update the typed controller-spec fixture**

Edit `backend/src/modules/tracking/tracking.controller.spec.ts` — add to `mockResponse` (after `latestChapterNumber: null,`):

```typescript
    extractorPath: null,
```

- [ ] **Step 8: Run the full tracking suite + build**

Run: `npx jest src/modules/tracking`
Expected: PASS (service + controller + repository specs).

Run: `npm run build`
Expected: `Build successful`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/modules/tracking/entities/tracking-source.entity.ts backend/src/modules/tracking/dto/tracking-source.dto.ts backend/src/modules/tracking/tracking.service.ts backend/src/modules/tracking/tracking.service.spec.ts backend/src/modules/tracking/tracking.controller.spec.ts
git commit -m "feat: add extractorPath to tracking source data layer"
```

---

### Task 3 (TDD): ChapterExtractor interface + JsonPathExtractor

**Skills:** `test-driven-development`, `javascript-typescript-jest`, `nestjs-best-practices` (type-first interface design)

**Files:**
- Create: `backend/src/modules/tracking/extractors/chapter-extractor.interface.ts`
- Create: `backend/src/modules/tracking/extractors/json-path-extractor.ts`
- Create: `backend/src/modules/tracking/extractors/json-path-extractor.spec.ts`

- [ ] **Step 1: Create the interface**

Create `backend/src/modules/tracking/extractors/chapter-extractor.interface.ts`:

```typescript
export interface ChapterExtractor {
  extract(responseBody: unknown): string | null;
}
```

- [ ] **Step 2: Write the failing extractor tests**

Create `backend/src/modules/tracking/extractors/json-path-extractor.spec.ts`:

```typescript
import { JsonPathExtractor } from './json-path-extractor';

describe('JsonPathExtractor', () => {
  describe('without an extractor path', () => {
    it('should extract root chapterNumber as a string', () => {
      const extractor = new JsonPathExtractor();
      expect(extractor.extract({ chapterNumber: 1120 })).toBe('1120');
      expect(extractor.extract({ chapterNumber: '1120.5' })).toBe('1120.5');
    });

    it('should return null when chapterNumber is missing', () => {
      expect(new JsonPathExtractor().extract({ foo: 'bar' })).toBeNull();
    });

    it('should return null when the value is not a string or number', () => {
      expect(
        new JsonPathExtractor().extract({ chapterNumber: {} }),
      ).toBeNull();
    });
  });

  describe('with a dot-notation path', () => {
    it('should navigate nested objects', () => {
      const extractor = new JsonPathExtractor('data.chapterNumber');
      expect(extractor.extract({ data: { chapterNumber: 7 } })).toBe('7');
    });

    it('should navigate array indices', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      const body = { data: { chapters: [{ number: '1120.5' }] } };
      expect(extractor.extract(body)).toBe('1120.5');
    });

    it('should return null when an intermediate segment is missing', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      expect(extractor.extract({ data: {} })).toBeNull();
    });

    it('should return null when the array index is out of bounds', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      expect(extractor.extract({ data: { chapters: [] } })).toBeNull();
    });

    it('should return null when an intermediate value is not an array', () => {
      const extractor = new JsonPathExtractor('data.chapters[0].number');
      expect(extractor.extract({ data: { chapters: 'x' } })).toBeNull();
    });
  });

  describe('constructor with null path', () => {
    it('should fall back to root chapterNumber', () => {
      const extractor = new JsonPathExtractor(null);
      expect(extractor.extract({ chapterNumber: '3' })).toBe('3');
    });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx jest src/modules/tracking/extractors/json-path-extractor.spec.ts`
Expected: FAIL — module `./json-path-extractor` cannot be resolved.

- [ ] **Step 4: Implement JsonPathExtractor**

Create `backend/src/modules/tracking/extractors/json-path-extractor.ts`:

```typescript
import { ChapterExtractor } from './chapter-extractor.interface';

export class JsonPathExtractor implements ChapterExtractor {
  constructor(private readonly path?: string | null) {}

  extract(responseBody: unknown): string | null {
    if (!this.path) {
      return this.toPrimitiveString(
        this.readKey(responseBody, 'chapterNumber'),
      );
    }
    return this.toPrimitiveString(this.navigate(responseBody, this.path));
  }

  private navigate(body: unknown, path: string): unknown {
    let current: unknown = body;
    for (const segment of path.split('.')) {
      if (current == null) {
        return null;
      }
      const { key, index } = this.parseSegment(segment);
      current = this.readKey(current, key);
      if (index !== null) {
        if (!Array.isArray(current)) {
          return null;
        }
        current = current[index];
      }
    }
    return current;
  }

  private parseSegment(segment: string): {
    key: string;
    index: number | null;
  } {
    const match = segment.match(/^([^[]+)(?:\[(\d+)\])?$/);
    if (!match) {
      return { key: segment, index: null };
    }
    return {
      key: match[1],
      index: match[2] ? parseInt(match[2], 10) : null,
    };
  }

  private readKey(obj: unknown, key: string): unknown {
    if (obj == null || typeof obj !== 'object') {
      return null;
    }
    const record = obj as Record<string, unknown>;
    return key in record ? record[key] : null;
  }

  private toPrimitiveString(value: unknown): string | null {
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return null;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest src/modules/tracking/extractors/json-path-extractor.spec.ts`
Expected: PASS — 9 tests green.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/tracking/extractors/
git commit -m "feat: add chapter extractor strategy with JSON path support"
```

---

### Task 4 (TDD): Repository check-query methods

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/src/modules/tracking/tracking.repository.ts`
- Modify: `backend/src/modules/tracking/tracking.repository.spec.ts`

- [ ] **Step 1: Write the failing repository tests**

Edit `backend/src/modules/tracking/tracking.repository.spec.ts` — append before the final closing `});` of the top-level describe:

```typescript
  describe('findAllSourcesForCheck', () => {
    it('should return all sources with the manga relation', async () => {
      const mockData = [{ id: 1 }] as TrackingSource[];
      mockSourceRepo.find.mockResolvedValue(mockData);

      const result = await repo.findAllSourcesForCheck();

      expect(mockSourceRepo.find).toHaveBeenCalledWith({
        relations: ['manga'],
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('findByMangaIdForCheck', () => {
    it('should filter by mangaId and load the manga relation', async () => {
      const mockData = [{ id: 1 }] as TrackingSource[];
      const createQueryBuilder = jest.fn();
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };
      createQueryBuilder.mockReturnValue(qb as any);
      mockSourceRepo.createQueryBuilder = createQueryBuilder;

      const result = await repo.findByMangaIdForCheck(7);

      expect(createQueryBuilder).toHaveBeenCalledWith('source');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'source.manga',
        'manga',
      );
      expect(qb.where).toHaveBeenCalledWith('source.mangaId = :mangaId', {
        mangaId: 7,
      });
      expect(result).toEqual(mockData);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/modules/tracking/tracking.repository.spec.ts`
Expected: FAIL — `repo.findAllSourcesForCheck is not a function`.

- [ ] **Step 3: Implement the repository methods**

Edit `backend/src/modules/tracking/tracking.repository.ts` — add after `findSourceById`:

```typescript
  findAllSourcesForCheck = async (): Promise<TrackingSource[]> => {
    return await this.sourceRepo.find({ relations: ['manga'] });
  };

  findByMangaIdForCheck = async (
    mangaId: number,
  ): Promise<TrackingSource[]> => {
    return await this.sourceRepo
      .createQueryBuilder('source')
      .leftJoinAndSelect('source.manga', 'manga')
      .where('source.mangaId = :mangaId', { mangaId })
      .getMany();
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/modules/tracking/tracking.repository.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.repository.ts backend/src/modules/tracking/tracking.repository.spec.ts
git commit -m "feat: add tracking source fetch methods for checks"
```

---

### Task 5 (TDD): `checkSource` — single-source check with comparison and persistence

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest`, `nestjs-best-practices` (exception mapping)

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Add the httpService mock to the test module**

Edit `backend/src/modules/tracking/tracking.service.spec.ts`:

(a) Add the import at the top of the file (after the existing `@nestjs/common` import line):

```typescript
import { HttpService } from '@nestjs/axios';
```

(b) Add the variable declaration inside the `describe('TrackingService', () => {` body, next to the existing `let mangaRepo` declaration:

```typescript
  let httpService: { axiosRef: { get: jest.Mock } };
```

(c) Change the top of `beforeEach` so the mock instance is created BEFORE the testing module compiles (this instance is then both registered as the provider and returned by `module.get(HttpService)`):

```typescript
  beforeEach(async () => {
    httpService = { axiosRef: { get: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
```

(d) Add the `HttpService` provider to the existing providers array, after the `MangaRepository` block:

```typescript
        {
          provide: HttpService,
          useValue: httpService,
        },
```

(e) After the existing line `mangaRepo = module.get(MangaRepository);`, add:

```typescript
    httpService = module.get(HttpService);
```

- [ ] **Step 2: Add repo-method stubs**

Add to the `TrackingRepository` `useValue` object in the spec: `findAllSourcesForCheck: jest.fn()`, `findByMangaIdForCheck: jest.fn()`, and `updateSource` already exists.

- [ ] **Step 3: Write the failing tests for `checkSource`**

Append after the `deleteSource` describe block in `backend/src/modules/tracking/tracking.service.spec.ts`:

```typescript
  describe('checkSource', () => {
    const source = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      extractorPath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return updated true and persist when a newer chapter is found', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '101' },
      });
      trackingRepo.updateSource.mockResolvedValue({
        ...source,
        latestChapterNumber: '101',
      } as any);

      const result = await service.checkSource(1);

      expect(result).toEqual({
        updated: true,
        previous: '100',
        current: '101',
        mangaId: 1,
      });
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        latestChapterNumber: '101',
      });
    });

    it('should compare decimals numerically (1120.5 > 1120)', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        latestChapterNumber: '1120',
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: 1120.5 },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({
        updated: true,
        previous: '1120',
        current: '1120.5',
        mangaId: 1,
      });
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        latestChapterNumber: '1120.5',
      });
    });

    it('should use extractorPath to navigate nested JSON', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        extractorPath: 'data.chapters[0].number',
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { data: { chapters: [{ number: '1140' }] } },
      });
      trackingRepo.updateSource.mockResolvedValue({} as any);

      const result = await service.checkSource(1);

      expect(result).toEqual({
        updated: true,
        previous: '100',
        current: '1140',
        mangaId: 1,
      });
    });

    it('should not update when the chapter is the same', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '100' },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({ updated: false, current: '100' });
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should not update when the chapter is older', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        latestChapterNumber: '200',
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '150' },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({ updated: false, current: '150' });
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should not update when previous chapter number is null', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        latestChapterNumber: null,
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '50' },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({ updated: false, current: '50' });
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the source does not exist', async () => {
      trackingRepo.findSourceById.mockResolvedValue(null);

      await expect(service.checkSource(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(httpService.axiosRef.get).not.toHaveBeenCalled();
    });

    it('should throw BadGatewayException when the URL is unreachable', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockRejectedValue(
        new Error('ECONNREFUSED'),
      );

      await expect(service.checkSource(1)).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('should throw UnprocessableEntityException when the body is not valid JSON', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: '<html>not json</html>',
      });

      await expect(service.checkSource(1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException when the chapter number is not extractable', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { foo: 'bar' },
      });

      await expect(service.checkSource(1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });
```

Add imports for the exceptions at the top of the spec (existing import line from '@nestjs/common'): extend it to include `BadGatewayException, UnprocessableEntityException`.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npx jest src/modules/tracking/tracking.service.spec.ts`
Expected: FAIL — `service.checkSource is not a function`, plus TS errors (missing `checkSource`, missing `HttpService` constructor arg).

- [ ] **Step 5: Implement the check logic**

Edit `backend/src/modules/tracking/tracking.service.ts`:

(a) Imports — change the `@nestjs/common` import to:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
```

Add: `import { HttpService } from '@nestjs/axios';` and `import { JsonPathExtractor } from './extractors/json-path-extractor';` after the existing imports.

(b) Add exported result types after the class-level import block:

```typescript
export type CheckResult =
  | { updated: true; previous: string; current: string; mangaId: number }
  | { updated: false; current: string };

export type AggregateCheckResult = {
  sourceId: number;
  sourceName: string;
  url: string;
  updated: boolean;
  previous?: string;
  current?: string;
  error?: string;
};
```

(c) Constructor — inject `HttpService`:

```typescript
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly mangaRepository: MangaRepository,
    private readonly httpService: HttpService,
  ) {}
```

(d) Add the public `checkSource` method and private helpers after `deleteSource`:

```typescript
  checkSource = async (id: number): Promise<CheckResult> => {
    const source = await this.trackingRepository.findSourceById(id);
    if (!source) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }
    return this.performSourceCheck(source);
  };

  private performSourceCheck = async (
    source: TrackingSource,
  ): Promise<CheckResult> => {
    let body: unknown;
    try {
      const response = await this.httpService.axiosRef.get(source.url);
      body =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new UnprocessableEntityException('Response parsing failed');
      }
      throw new BadGatewayException(
        `Source URL is unreachable: ${source.url}`,
      );
    }

    const extractor = new JsonPathExtractor(source.extractorPath);
    const current = extractor.extract(body);
    if (current === null) {
      throw new UnprocessableEntityException('Response parsing failed');
    }

    const previous = source.latestChapterNumber;
    const comparison = this.compareChapterNumbers(previous, current);
    if (comparison !== 'newer') {
      return { updated: false, current };
    }

    await this.trackingRepository.updateSource(source.id, {
      latestChapterNumber: current,
    });
    return {
      updated: true,
      previous,
      current,
      mangaId: source.manga.id,
    };
  };

  private compareChapterNumbers = (
    previous: string | null,
    current: string,
  ): 'newer' | 'same' | 'different' => {
    const prevNum = previous === null ? NaN : parseFloat(previous);
    const currentNum = parseFloat(current);
    if (Number.isFinite(prevNum) && Number.isFinite(currentNum)) {
      if (currentNum > prevNum) return 'newer';
      if (currentNum === prevNum) return 'same';
      return 'different';
    }
    return current === previous ? 'same' : 'different';
  };
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest src/modules/tracking/tracking.service.spec.ts`
Expected: PASS — all 10 new `checkSource` tests plus the existing 20+ remain green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.ts backend/src/modules/tracking/tracking.service.spec.ts
git commit -m "feat: add single source check with chapter comparison"
```

---

### Task 6 (TDD): `checkMangaSources` and `checkAllSources` aggregation

**Skills:** `test-driven-development`, `nestjs-testing`, `javascript-typescript-jest` (Promise.allSettled patterns), `nestjs-best-practices`

**Files:**
- Modify: `backend/src/modules/tracking/tracking.service.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.service.ts`

- [ ] **Step 1: Write the failing tests**

Append after the `checkSource` describe block in `backend/src/modules/tracking/tracking.service.spec.ts`:

```typescript
  describe('checkMangaSources', () => {
    const sources = [
      {
        id: 1,
        manga: { id: 1, title: 'One Piece' },
        url: 'https://a.com/manga/one-piece',
        name: 'SourceA',
        latestChapterNumber: '10',
      },
      {
        id: 2,
        manga: { id: 1, title: 'One Piece' },
        url: 'https://b.com/manga/one-piece',
        name: 'SourceB',
        latestChapterNumber: '20',
      },
    ];

    it('should throw NotFoundException when the manga does not exist', async () => {
      mangaRepo.findOneById.mockResolvedValue(null);

      await expect(service.checkMangaSources(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.findByMangaIdForCheck).not.toHaveBeenCalled();
    });

    it('should return an empty array when the manga has no sources', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findByMangaIdForCheck.mockResolvedValue([]);

      const result = await service.checkMangaSources(1);

      expect(result).toEqual([]);
    });

    it('should aggregate per-source results', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findByMangaIdForCheck.mockResolvedValue(sources as any);
      (httpService.axiosRef.get as jest.Mock)
        .mockResolvedValueOnce({ data: { chapterNumber: '11' } })
        .mockResolvedValueOnce({ data: { chapterNumber: '20' } });
      trackingRepo.updateSource.mockResolvedValue({} as any);

      const result = await service.checkMangaSources(1);

      expect(result).toEqual([
        {
          sourceId: 1,
          sourceName: 'SourceA',
          url: 'https://a.com/manga/one-piece',
          updated: true,
          previous: '10',
          current: '11',
        },
        {
          sourceId: 2,
          sourceName: 'SourceB',
          url: 'https://b.com/manga/one-piece',
          updated: false,
          current: '20',
        },
      ]);
      expect(trackingRepo.updateSource).toHaveBeenCalledTimes(1);
    });

    it('should include per-source errors without failing the aggregate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findByMangaIdForCheck.mockResolvedValue(sources as any);
      (httpService.axiosRef.get as jest.Mock)
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce({ data: { chapterNumber: '20' } });
      trackingRepo.updateSource.mockResolvedValue({} as any);

      const result = await service.checkMangaSources(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sourceId: 1,
        sourceName: 'SourceA',
        url: 'https://a.com/manga/one-piece',
        updated: false,
        error: 'ECONNREFUSED',
      });
      expect(result[1]).toEqual({
        sourceId: 2,
        sourceName: 'SourceB',
        url: 'https://b.com/manga/one-piece',
        updated: false,
        current: '20',
      });
    });
  });

  describe('checkAllSources', () => {
    const sources = [
      {
        id: 1,
        manga: { id: 1, title: 'One Piece' },
        url: 'https://a.com/manga/one-piece',
        name: 'SourceA',
        latestChapterNumber: '10',
      },
      {
        id: 2,
        manga: { id: 2, title: 'Naruto' },
        url: 'https://b.com/manga/naruto',
        name: 'SourceB',
        latestChapterNumber: '20',
      },
    ];

    it('should check every source and aggregate results', async () => {
      trackingRepo.findAllSourcesForCheck.mockResolvedValue(sources as any);
      (httpService.axiosRef.get as jest.Mock)
        .mockResolvedValueOnce({ data: { chapterNumber: '12' } })
        .mockResolvedValueOnce({ data: { chapterNumber: '20' } });
      trackingRepo.updateSource.mockResolvedValue({} as any);

      const result = await service.checkAllSources();

      expect(result).toEqual([
        {
          sourceId: 1,
          sourceName: 'SourceA',
          url: 'https://a.com/manga/one-piece',
          updated: true,
          previous: '10',
          current: '12',
        },
        {
          sourceId: 2,
          sourceName: 'SourceB',
          url: 'https://b.com/manga/naruto',
          updated: false,
          current: '20',
        },
      ]);
    });

    it('should include per-source errors without failing the aggregate', async () => {
      trackingRepo.findAllSourcesForCheck.mockResolvedValue(sources as any);
      (httpService.axiosRef.get as jest.Mock)
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ data: { chapterNumber: '21' } });
      trackingRepo.updateSource.mockResolvedValue({} as any);

      const result = await service.checkAllSources();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        sourceId: 1,
        sourceName: 'SourceA',
        url: 'https://a.com/manga/one-piece',
        updated: false,
        error: 'boom',
      });
      expect(result[1].updated).toBe(true);
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/modules/tracking/tracking.service.spec.ts`
Expected: FAIL — `service.checkMangaSources is not a function`.

- [ ] **Step 3: Implement the aggregate methods**

Edit `backend/src/modules/tracking/tracking.service.ts` — add after `checkSource` (and after the private `performSourceCheck`/`compareChapterNumbers` helpers):

```typescript
  checkMangaSources = async (
    mangaId: number,
  ): Promise<AggregateCheckResult[]> => {
    const manga = await this.mangaRepository.findOneById(mangaId);
    if (!manga) {
      throw new NotFoundException(`Manga with ID ${mangaId} not found`);
    }

    const sources = await this.trackingRepository.findByMangaIdForCheck(
      mangaId,
    );
    return this.performAggregateCheck(sources);
  };

  checkAllSources = async (): Promise<AggregateCheckResult[]> => {
    const sources = await this.trackingRepository.findAllSourcesForCheck();
    return this.performAggregateCheck(sources);
  };

  private performAggregateCheck = async (
    sources: TrackingSource[],
  ): Promise<AggregateCheckResult[]> => {
    const settled = await Promise.allSettled(
      sources.map(async (source) => {
        const result = await this.performSourceCheck(source);
        return {
          sourceId: source.id,
          sourceName: source.name,
          url: source.url,
          updated: result.updated,
          ...(result.updated
            ? { previous: result.previous, current: result.current }
            : { current: result.current }),
        };
      }),
    );

    return settled.map((entry, index) => {
      const source = sources[index];
      if (entry.status === 'fulfilled') {
        return entry.value;
      }
      const reason =
        entry.reason instanceof Error
          ? entry.reason.message
          : String(entry.reason);
      return {
        sourceId: source.id,
        sourceName: source.name,
        url: source.url,
        updated: false,
        error: reason,
      };
    });
  };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/modules/tracking/tracking.service.spec.ts`
Expected: PASS — all aggregate tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tracking/tracking.service.ts backend/src/modules/tracking/tracking.service.spec.ts
git commit -m "feat: add aggregate manga and all-source check endpoints logic"
```

---

### Task 7 (TDD): Controller endpoints

**Skills:** `test-driven-development`, `nestjs-best-practices` (route ordering, exception propagation), `nestjs-testing`, `javascript-typescript-jest`

**Files:**
- Modify: `backend/src/modules/tracking/tracking.controller.spec.ts`
- Modify: `backend/src/modules/tracking/tracking.controller.ts`

- [ ] **Step 1: Write the failing controller tests**

Edit `backend/src/modules/tracking/tracking.controller.spec.ts`:

(a) Add the new methods to the `TrackingService` `useValue` mock, after `updateConfig: jest.fn(),`:

```typescript
            checkSource: jest.fn(),
            checkMangaSources: jest.fn(),
            checkAllSources: jest.fn(),
```

(b) Append before the final closing `});` of the top-level describe:

```typescript
  describe('checkSource', () => {
    it('should call service.checkSource with the parsed id', async () => {
      const result = {
        updated: true,
        previous: '100',
        current: '101',
        mangaId: 1,
      };
      service.checkSource.mockResolvedValue(result);

      const response = await controller.checkSource('1');

      expect(response).toEqual(result);
      expect(service.checkSource).toHaveBeenCalledWith(1);
    });
  });

  describe('checkManga', () => {
    it('should call service.checkMangaSources with the parsed mangaId', async () => {
      service.checkMangaSources.mockResolvedValue([]);

      const result = await controller.checkManga('5');

      expect(result).toEqual([]);
      expect(service.checkMangaSources).toHaveBeenCalledWith(5);
    });
  });

  describe('checkAll', () => {
    it('should call service.checkAllSources', async () => {
      service.checkAllSources.mockResolvedValue([]);

      const result = await controller.checkAll();

      expect(result).toEqual([]);
      expect(service.checkAllSources).toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/modules/tracking/tracking.controller.spec.ts`
Expected: FAIL — `controller.checkSource is not a function`.

- [ ] **Step 3: Implement the controller endpoints**

Edit `backend/src/modules/tracking/tracking.controller.ts`:

(a) Extend the `@nestjs/swagger` import to include:

```typescript
  ApiNotFoundResponse,
  ApiBadGatewayResponse,
  ApiUnprocessableEntityResponse,
```

(b) Add to the imports from `./tracking.service`:

```typescript
import {
  TrackingService,
  CheckResult,
  AggregateCheckResult,
} from './tracking.service';
```

(c) Add the three methods after `delete` (before `getConfig`):

```typescript
  @Post('check-all')
  @ApiOperation({ summary: 'Check all tracking sources' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          sourceId: 1,
          sourceName: 'MangaDex',
          url: 'https://example.com/manga/one-piece',
          updated: true,
          previous: '100',
          current: '101',
        },
      ],
    },
  })
  async checkAll(): Promise<AggregateCheckResult[]> {
    return this.trackingService.checkAllSources();
  }

  @Post('check-manga/:mangaId')
  @ApiOperation({ summary: 'Check all sources of a manga' })
  @ApiParam({ name: 'mangaId', type: Number })
  @ApiOkResponse({
    schema: {
      example: [
        {
          sourceId: 1,
          sourceName: 'MangaDex',
          url: 'https://example.com/manga/one-piece',
          updated: false,
          error: 'Source URL is unreachable: https://example.com/manga/one-piece',
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Manga not found' })
  async checkManga(
    @Param('mangaId') mangaId: string,
  ): Promise<AggregateCheckResult[]> {
    return this.trackingService.checkMangaSources(parseInt(mangaId, 10));
  }

  @Post(':id/check')
  @ApiOperation({ summary: 'Check a single tracking source' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    schema: {
      example: { updated: true, previous: '100', current: '101', mangaId: 1 },
    },
  })
  @ApiNotFoundResponse({ description: 'Tracking source not found' })
  @ApiBadGatewayResponse({ description: 'Source URL is unreachable' })
  @ApiUnprocessableEntityResponse({ description: 'Response parsing failed' })
  async check(
    @Param('id') id: string,
  ): Promise<CheckResult> {
    return this.trackingService.checkSource(parseInt(id, 10));
  }
```

Note: literal routes (`check-all`, `check-manga/:mangaId`) are declared before the param route (`:id/check`), matching the existing `config`-before-`:id` convention. There is no route collision: `:id/check` requires a second literal `check` segment.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/modules/tracking/tracking.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Run the full tracking suite + build**

Run: `npx jest src/modules/tracking`
Expected: PASS.

Run: `npm run build`
Expected: `Build successful`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/tracking/tracking.controller.ts backend/src/modules/tracking/tracking.controller.spec.ts
git commit -m "feat: add tracking source check endpoints"
```

---

### Task 8: Full verification and acceptance check

**Skills:** `verification-before-completion`, `test-driven-development` (regression red/green), `nestjs-testing`

**Files:**
- None modified unless a check fails

- [ ] **Step 1: Run the entire backend test suite**

Run: `npm test`
Expected: all specs PASS (tracking service/controller/repository/extractor plus all other modules).

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no errors (Prettier/eslint auto-fix may reformat; re-run tests after if files changed).

If lint reports formatting issues: run `npm run format` then re-run `npx jest src/modules/tracking` to confirm nothing broke.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: `Build successful`, no TS errors.

- [ ] **Step 4: Acceptance checklist against `tasks/MR116.md`**

Verify each (via the test suite above — no manual curl needed):

- [ ] `POST /tracking-sources/:id/check` returns `{ updated: true, previous, current, mangaId }` when newer (Task 5 test "should return updated true and persist when a newer chapter is found")
- [ ] returns `{ updated: false, current }` when not newer (Task 5 tests)
- [ ] 502 when URL unreachable (Task 5 "should throw BadGatewayException")
- [ ] 422 when body unparseable (Task 5 "should throw UnprocessableEntityException when the body is not valid JSON")
- [ ] custom extractorPath navigates nested JSON (Task 5 "should use extractorPath to navigate nested JSON" + Task 3 extractor suite)
- [ ] `check-manga/:mangaId` returns per-source array (Task 6)
- [ ] `check-all` checks all sources (Task 6)
- [ ] one failing source does not block others (Tasks 6 partial-failure tests)
- [ ] `latestChapterNumber` persisted when updated (Task 5 updateSource assertion)
- [ ] decimals compared numerically ("1120.5" > "1120" — Task 5 decimal test)

- [ ] **Step 5: Final commit if lint/format touched anything**

```bash
git add -A && git commit -m "chore: apply lint fixes after MR116 implementation"
```

(Only if Step 2 modified files; otherwise skip.)

---

## Out of scope (per approved design)

- Scheduled/cron execution of checks using `TrackingConfig.frequency`/`interval`/`runAt`.
- Frontend check UI, alternative extractor types (CSS/regex), SSRF hardening, `check-all` pagination.
- E2E specs for the check endpoints (real outbound HTTP is non-deterministic in CI; unit coverage at service + controller level replaces it).