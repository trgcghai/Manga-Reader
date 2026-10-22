# MR106 — Reading Flag API Endpoint Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `PATCH /mangas/:mangaId/flag` endpoint that updates only the reading flag and returns the full `MangaResponse`.

**Architecture:** New `UpdateMangaFlagDto`, new `updateFlag` method in repository and service, new `PATCH :mangaId/flag` route in controller. Also fix `findOne` response mapping to include `readingFlag`.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, class-validator, @nestjs/swagger

**Related Skills:** `nestjs-best-practices` (Tasks 2-4)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/modules/manga/dto/manga.dto.ts` | Modify | Add `UpdateMangaFlagDto` class |
| `backend/src/modules/manga/repositories/manga.repository.ts` | Modify | Add `updateFlag(id, flag)` method |
| `backend/src/modules/manga/services/manga.service.ts` | Modify | Add `updateFlag()` method; fix `findOne()` to include `readingFlag` in response |
| `backend/src/modules/manga/manga.controller.ts` | Modify | Add `PATCH :mangaId/flag` route |

---

### Task 1: Add UpdateMangaFlagDto

**Files:**
- Modify: `backend/src/modules/manga/dto/manga.dto.ts`

**Related skills:** None (simple DTO class)

- [ ] **Add `UpdateMangaFlagDto`** after the existing `UpdateMangaDto` class (before the file's closing):

```typescript
export class UpdateMangaFlagDto {
  @ApiProperty({ enum: ReadingFlag, nullable: true })
  @IsOptional()
  @IsEnum(ReadingFlag)
  flag?: ReadingFlag;
}
```

The import for `ReadingFlag` is already present from MR105.

---

### Task 2: Add updateFlag to MangaRepository

**Files:**
- Modify: `backend/src/modules/manga/repositories/manga.repository.ts`

**Related skills:** `nestjs-best-practices` — repository pattern, single-responsibility method

- [ ] **Add `updateFlag` method** after the existing `update` method (after line 116):

```typescript
  updateFlag = async (
    id: number,
    flag: ReadingFlag | null,
  ): Promise<Manga | null> => {
    const manga = await this.repo.findOne({
      where: { id },
      relations: ['authors', 'genres'],
    });
    if (!manga) return null;

    manga.readingFlag = flag;
    return await this.repo.save(manga);
  };
```

- [ ] **Add `ReadingFlag` import** at the top of the file:

```typescript
import { ReadingFlag } from 'src/common/constants/manga.constant';
```

---

### Task 3: Add updateFlag to MangaService + fix findOne response

**Files:**
- Modify: `backend/src/modules/manga/services/manga.service.ts`

**Related skills:** `nestjs-best-practices` — service layer patterns, error handling

- [ ] **Add `updateFlag` method** after the existing `delete` method (after line 246):

```typescript
  updateFlag = async (
    id: number,
    flag: ReadingFlag | null,
  ): Promise<Manga> => {
    const existing = await this.mangaRepository.findOneByIdWithRelations(id);
    if (!existing) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }

    const updated = await this.mangaRepository.updateFlag(id, flag);
    if (!updated) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }
    return updated;
  };
```

- [ ] **Add `ReadingFlag` import** at the top of the file:

```typescript
import { ReadingFlag } from 'src/common/constants/manga.constant';
```

- [ ] **Fix `findOne` response mapping** to include `readingFlag` (after line 75, add `readingFlag` field):

```typescript
    const base: MangaResponse = {
      id: manga.id,
      title: manga.title,
      alternativeTitles: manga.alternativeTitles ?? undefined,
      description: manga.description ?? undefined,
      coverPath: manga.coverPath ?? undefined,
      status: manga.status,
      readingFlag: manga.readingFlag ?? undefined,
      authors: manga.authors.map((a) => ({ id: a.id, name: a.name })),
      genres: manga.genres.map((g) => ({ id: g.id, name: g.name })),
      createdAt: manga.createdAt.toISOString(),
      updatedAt: manga.updatedAt.toISOString(),
    };
```

---

### Task 4: Add PATCH :mangaId/flag route to controller

**Files:**
- Modify: `backend/src/modules/manga/manga.controller.ts`

**Related skills:** `nestjs-best-practices` — REST endpoint patterns, Swagger decorators

- [ ] **Add import** for `UpdateMangaFlagDto`:

```typescript
import {
  CreateMangaDto,
  UpdateMangaDto,
  UpdateMangaFlagDto,
} from 'src/modules/manga/dto/manga.dto';
```

- [ ] **Add the new route** after the existing `@Patch(':id')` handler (after line 151):

```typescript
  @Patch(':mangaId/flag')
  @ApiOperation({ summary: 'Update manga reading flag' })
  @ApiParam({ name: 'mangaId', type: Number })
  updateFlag(
    @Param('mangaId', ParseIntPipe) mangaId: number,
    @Body() dto: UpdateMangaFlagDto,
  ) {
    return this.mangaService.updateFlag(mangaId, dto.flag ?? null);
  }
```

---

### Task 5: Verify build and tests pass

**Related skills:** None (verification step)

- [ ] **Run type check / build:**

```bash
cd backend && npm run build
```

Expected: no TS errors, build succeeds.

- [ ] **Run existing tests** to confirm no regressions:

```bash
cd backend && npm run test
```

Expected: all existing tests pass.
