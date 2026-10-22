# MR109 — Backend readingFlag Filter on GET /mangas

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `readingFlag` query parameter to `GET /mangas` to filter manga by reading flag, supporting specific values and `any` for non-null.

**Architecture:** New `@Query('readingFlag')` param on the controller, validation + pass-through in the service, conditional WHERE clause in the repository.

**Tech Stack:** NestJS, TypeORM, PostgreSQL

**Related Skills:** `nestjs-best-practices` (Tasks 1-3)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/modules/manga/manga.controller.ts` | Modify | Add `@Query('readingFlag')` param + Swagger annotation |
| `backend/src/modules/manga/services/manga.service.ts` | Modify | Add validation + pass `readingFlag` to repository |
| `backend/src/modules/manga/repositories/manga.repository.ts` | Modify | Add conditional WHERE clause for `readingFlag` |

---

### Task 1: Add readingFlag query param to controller

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`

**Related skills:** `nestjs-best-practices` — REST query params, Swagger docs

- [ ] **Add `@ApiQuery` decorator** for the new param, after the existing `genres` query (after line 77):

```typescript
  @ApiQuery({
    name: 'readingFlag',
    required: false,
    description: 'Filter by reading flag. Use "any" for all flagged manga.',
    enum: [...Object.values(ReadingFlag), 'any'],
  })
```

- [ ] **Add `ReadingFlag` import** at the top of the file (alongside other imports):

```typescript
import { ReadingFlag } from 'src/common/constants/manga.constant';
```

- [ ] **Add `@Query('readingFlag')` param** to the `findAll` method signature (after `status`):

```typescript
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('readingFlag') readingFlag?: string,
  ) {
    return this.mangaService.findAll(
      parseInt(page),
      parseInt(limit),
      search,
      status,
      readingFlag,
    );
  }
```

---

### Task 2: Add validation and pass-through in service

**Files:**
- Modify: `backend/src/modules/manga/services/manga.service.ts`

**Related skills:** `nestjs-best-practices` — validation at service layer, BadRequestException

- [ ] **Add `ReadingFlag` import** at the top if not already present (from MR106, it should already be there):

```typescript
import { ReadingFlag } from 'src/common/constants/manga.constant';
```

- [ ] **Update `findAll` method** to accept and validate `readingFlag`, then pass to repository:

```typescript
  findAll = async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string,
    readingFlag?: string,
  ): Promise<{
    data: Manga[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const VALID_FLAG_FILTERS = [...Object.values(ReadingFlag), 'any'];
    if (readingFlag && !VALID_FLAG_FILTERS.includes(readingFlag as any)) {
      throw new BadRequestException(
        `Invalid readingFlag value. Allowed: ${VALID_FLAG_FILTERS.join(', ')}`,
      );
    }
    return await this.mangaRepository.findAll(page, limit, search, status, undefined, undefined, readingFlag);
  };
```

Note: `authors` and `genres` params already exist but are passed as `undefined` here since they're not used from this endpoint. The repository signature is `findAll(page, limit, search?, status?, authors?, genres?, readingFlag?)`.

- [ ] **Also add `BadRequestException`** to the NestJS imports if not already present (should be):

```typescript
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
```

---

### Task 3: Add WHERE clause to repository

**Files:**
- Modify: `backend/src/modules/manga/repositories/manga.repository.ts`

**Related skills:** `nestjs-best-practices` — TypeORM query builder pattern

- [ ] **Update `findAll` method signature** to accept optional `readingFlag` param:

```typescript
  findAll = async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
    authors?: string[],
    genres?: string[],
    readingFlag?: string,
  ): Promise<{
```

- [ ] **Add the `readingFlag` WHERE clause** after the existing `genres` filter block (after line 65) and before the ordering (line 68):

```typescript
    if (readingFlag === 'any') {
      query.andWhere('manga.readingFlag IS NOT NULL');
    } else if (readingFlag) {
      query.andWhere('manga.readingFlag = :readingFlag', { readingFlag });
    }
```

---

### Task 4: Verify build and tests pass

- [ ] **Run type check / build:**

```bash
cd backend && npm run build
```

Expected: no TS errors, build succeeds.

- [ ] **Run existing tests:**

```bash
cd backend && npm run test
```

Expected: all 30 suites, 316+ tests pass.
