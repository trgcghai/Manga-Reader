# Reading Flag — Entity Design

## Summary

Add a `readingFlag` column to the `Manga` entity to let the user track personal reading progress independently of the manga's publication `status`.

## Design

### Enum

A new `ReadingFlag` enum in `backend/src/common/constants/manga.constant.ts`:

```
READING     = 'reading'
RE_READING  = 're-reading'
PLANNED     = 'planned'
COMPLETED   = 'completed'
PAUSED      = 'paused'
DROPPED     = 'dropped'
```

Follows the exact same pattern as the existing `MangaStatus` enum in the same file.

### Entity Column

On `Manga` entity (`backend/src/modules/manga/entities/manga.entity.ts`):

- Type: TypeORM `enum` column
- Enum: `ReadingFlag`
- Nullable: `true` (existing rows have no flag)
- Field name: `readingFlag`
- TypeScript: `readingFlag?: ReadingFlag` (optional, nullable)

### Response DTOs

- `MangaResponse` (`backend/src/modules/manga/dto/manga.dto.ts`):
  - Add `readingFlag?: ReadingFlag`
- `MangaDetailResponse` inherits from `MangaResponse` automatically

### Migration

Generate a TypeORM migration that adds a nullable enum column `readingFlag` to the `manga` table.

## Files Changed

- `backend/src/common/constants/manga.constant.ts` — add `ReadingFlag` enum
- `backend/src/modules/manga/entities/manga.entity.ts` — add `readingFlag` column
- `backend/src/modules/manga/dto/manga.dto.ts` — add `readingFlag` to responses
- (auto-generated) TypeORM migration file

## Rationale

- **Separate from `status`**: `status` tracks publication state (ongoing/completed/paused). `readingFlag` tracks the reader's personal intent. They serve different purposes.
- **Approach A (TypeORM enum)**: Follows existing `MangaStatus` pattern, keeps schema consistent, provides DB-level type safety.
- **Nullable**: Default to `null` for existing records; no migration data backfill needed.
