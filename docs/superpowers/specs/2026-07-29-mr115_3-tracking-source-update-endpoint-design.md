# MR115_3 — PATCH /tracking-sources/:id Update Tracking Source Endpoint

## Overview

Add a `PATCH /tracking-sources/:id` endpoint to update a tracking source's `url` and/or `name`. Must preserve `latestChapterNumber`.

## Design Decisions

- **No mangaId in DTO** — manga assignment is set at creation and immutable. The existing `UpdateTrackingSourceDto` already only has optional `url` and `name`.
- **Duplicate checks via repository query methods** — add `findByMangaIdAndNameExcludingId(mangaId, name, excludeId)` and `findByMangaIdAndUrlExcludingId(mangaId, url, excludeId)` to `TrackingRepository` (in contrast to createSource's in-memory filter approach, since update must exclude the current source).
- **`latestChapterNumber` preserved** — the DTO intentionally omits it; only `url` and `name` can be modified.
- **Existing `updateSource` in repository** already handles the "not found → null" pattern, which maps to `NotFoundException`.
- **Response** returns `TrackingSourceResponseDto` on success (200).

## Request

```
PATCH /tracking-sources/:id
Content-Type: application/json

{
  "name": "MangaPlus"
}
```

## Responses

| Status | Body | Condition |
|--------|------|-----------|
| `200` | `TrackingSourceResponseDto` | Success |
| `400` | Validation error | Malformed URL |
| `404` | `{ message, error, statusCode }` | Source not found |
| `409` | `{ message, error, statusCode }` | Duplicate name or url for the manga |

## Modified Files

### `tracking.repository.ts`

Add two query methods:

```typescript
findByMangaIdAndNameExcludingId(
  mangaId: number,
  name: string,
  excludeId: number,
): Promise<TrackingSource | null>;

findByMangaIdAndUrlExcludingId(
  mangaId: number,
  url: string,
  excludeId: number,
): Promise<TrackingSource | null>;
```

### `tracking.service.ts`

Add `updateSource(id: number, dto: UpdateTrackingSourceDto): Promise<TrackingSourceResponseDto>`:

1. Fetch existing source (with manga relation) — `NotFoundException` if missing
2. If `name` changed, check `findByMangaIdAndNameExcludingId(mangaId, name, id)` — `ConflictException` if found
3. If `url` changed, check `findByMangaIdAndUrlExcludingId(mangaId, url, id)` — `ConflictException` if found
4. Call `trackingRepository.updateSource(id, { name, url })` with only provided fields
5. Return mapped `TrackingSourceResponseDto`

### `tracking.controller.ts`

Add `@Patch(':id')` handler with `@Param('id') id: string` and `@Body() dto: UpdateTrackingSourceDto`.

### `tracking.controller.spec.ts` (new tests)

- `PATCH /:id` updates name and returns updated DTO (200)
- `PATCH /:id` updates url and returns updated DTO (200)
- `PATCH /:id` does NOT reset `latestChapterNumber`
- `PATCH /:id` with non-existent id returns 404
- `PATCH /:id` with conflicting name returns 409
- `PATCH /:id` with conflicting url returns 409

### `tracking.service.spec.ts` (new tests)

- Updates name successfully
- Updates url successfully
- Preserves latestChapterNumber
- Throws NotFoundException when id not found
- Throws ConflictException when (mangaId, name) conflicts excluding self
- Throws ConflictException when (mangaId, url) conflicts excluding self
- Only calls updateSource when there are changes

## Out of Scope

- PATCH for `TrackingConfig`
- `DELETE /tracking-sources/:id` (future MR)
