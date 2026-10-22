# MR105 — ReadingFlag Entity Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `readingFlag` enum column to the Manga entity with 6 values (reading, re-reading, planned, completed, paused, dropped), nullable.

**Architecture:** New `ReadingFlag` enum in the shared constants file, a nullable TypeORM enum column on the `Manga` entity, and the field exposed in `MangaResponse`/`MangaDetailResponse`. No migration needed because `synchronize: true` is enabled in TypeORM config.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, class-validator, @nestjs/swagger

**Related Skills:** `nestjs-best-practices` for entity/DTO patterns (Tasks 2-3)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `backend/src/common/constants/manga.constant.ts` | Modify | Add `ReadingFlag` enum alongside existing `MangaStatus` |
| `backend/src/modules/manga/entities/manga.entity.ts` | Modify | Add `readingFlag` nullable enum column |
| `backend/src/modules/manga/dto/manga.dto.ts` | Modify | Add `readingFlag` to `MangaResponse` (inherited by `MangaDetailResponse`) |

No migration file is needed — `synchronize: true` in `app.module.ts` auto-creates the column on startup.

---

### Task 1: Add ReadingFlag enum

**Files:**
- Modify: `backend/src/common/constants/manga.constant.ts`

**Related skills:** None (straightforward TS enum)

- [ ] **Add the `ReadingFlag` enum** after the existing `MangaStatus` enum:

Modify `backend/src/common/constants/manga.constant.ts`:

```typescript
export enum MangaStatus {
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  PAUSED = 'paused',
}

export enum ReadingFlag {
  READING = 'reading',
  RE_READING = 're-reading',
  PLANNED = 'planned',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  DROPPED = 'dropped',
}
```

---

### Task 2: Add readingFlag column to Manga entity

**Files:**
- Modify: `backend/src/modules/manga/entities/manga.entity.ts`

**Related skills:** `nestjs-best-practices` — follows existing entity patterns

- [ ] **Import `ReadingFlag`** in the entity file:

```typescript
import { MangaStatus, ReadingFlag } from 'src/common/constants/manga.constant';
```

- [ ] **Add the column** after the `status` field (line 52):

```typescript
  @Column({
    type: 'enum',
    enum: ReadingFlag,
    nullable: true,
  })
  readingFlag?: ReadingFlag;
```

The final entity file should look like:

```typescript
import { MangaStatus, ReadingFlag } from 'src/common/constants/manga.constant';
import { Chapter } from './chapter.entity';
import { Author } from 'src/modules/author/entities/author.entity';
import { Genre } from 'src/modules/genre/entities/genre.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity()
@Index(['title'], { unique: true })
export class Manga {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', array: true, nullable: true })
  alternativeTitles: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToMany(() => Author, (author) => author.mangas)
  @JoinTable({
    name: 'manga_authors',
    joinColumn: { name: 'manga_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'author_id', referencedColumnName: 'id' },
  })
  authors: Author[];

  @ManyToMany(() => Genre, (genre) => genre.mangas)
  @JoinTable({
    name: 'manga_genres',
    joinColumn: { name: 'manga_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'genre_id', referencedColumnName: 'id' },
  })
  genres: Genre[];

  @Column({
    type: 'enum',
    enum: MangaStatus,
  })
  status: MangaStatus;

  @Column({
    type: 'enum',
    enum: ReadingFlag,
    nullable: true,
  })
  readingFlag?: ReadingFlag;

  @Column({ nullable: true })
  coverPath?: string;

  @OneToMany(() => Chapter, (chapter) => chapter.manga)
  chapters: Chapter[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### Task 3: Add readingFlag to response DTOs

**Files:**
- Modify: `backend/src/modules/manga/dto/manga.dto.ts`

**Related skills:** `nestjs-best-practices` — follows existing DTO response patterns

- [ ] **Import `ReadingFlag`** in the DTO file:

```typescript
import { MangaStatus, ReadingFlag } from 'src/common/constants/manga.constant';
```

- [ ] **Add `readingFlag`** to `MangaResponse` (after `status`, around line 45):

```typescript
  @ApiProperty({ enum: ReadingFlag, nullable: true })
  readingFlag?: ReadingFlag;
```

The relevant section after changes:

```typescript
  @ApiProperty()
  status: string;

  @ApiProperty({ enum: ReadingFlag, nullable: true })
  readingFlag?: ReadingFlag;

  @ApiProperty({ type: AuthorRef, isArray: true })
  authors: AuthorRef[];
```

No change needed for `MangaDetailResponse` — it extends `MangaResponse` and inherits the field.

---

### Task 4: Verify build and tests pass

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

Expected: all existing tests pass (the new field is nullable, so no existing behavior changes).

---

## Self-Review

- [ ] **Spec coverage:** The spec requires: (1) `ReadingFlag` enum, (2) nullable column on entity, (3) field in response DTOs. All three are covered by Tasks 1-3.
- [ ] **Placeholder scan:** No TBDs, TODOs, or placeholder patterns.
- [ ] **Type consistency:** All references use `ReadingFlag` consistently across enum, entity column, and DTO field. The `?` optional marker is used everywhere (nullable).
