# MR115_4 — DELETE /tracking-sources/:id Delete Tracking Source Endpoint

## Overview

Add a `DELETE /tracking-sources/:id` endpoint that hard deletes a tracking source. Returns `204` with no body on success and `404` if the source does not exist.

## Design Decisions

- **Fetch-then-delete pattern** — follows the existing delete pattern used by Author, Genre, Translator, and Manga services: fetch the entity first, throw `NotFoundException` if missing, then delete. Mirrors `updateSource`'s existence check in the tracking service.
- **No repository changes needed** — `TrackingRepository.deleteSource(id)` already exists (returns `boolean` from `result.affected`), matching the repository delete convention in other modules.
- **`@HttpCode(HttpStatus.NO_CONTENT)`** — NestJS `@Delete()` defaults to 200; the 204 status is set explicitly, matching the translation delete endpoint in `manga.controller.ts`.
- **Service returns `void`** — nothing is returned so the response has no body, per the `204` requirement.
- **Swagger** — `@ApiOperation`, `@ApiParam`, and `@ApiNoContentResponse` document the endpoint and its 204 response.

## Request

```
DELETE /tracking-sources/:id
```

## Responses

| Status | Body | Condition |
|--------|------|-----------|
| `204` | (empty) | Source deleted |
| `404` | `{ message, error, statusCode }` | Source not found |

## Modified Files

### `tracking.service.ts`

Add `deleteSource(id: number): Promise<void>`:

1. Call `trackingRepository.findSourceById(id)`
2. Throw `NotFoundException` if not found (message: `Tracking source with ID ${id} not found`)
3. Call `trackingRepository.deleteSource(id)`

### `tracking.controller.ts`

Add `@Delete(':id')` handler decorated with `@HttpCode(HttpStatus.NO_CONTENT)`, `@ApiOperation({ summary: 'Delete a tracking source' })`, `@ApiParam({ name: 'id', type: Number })`, and `@ApiNoContentResponse({ description: 'Tracking source deleted' })`. The handler parses `@Param('id')` to an int and delegates to `trackingService.deleteSource`.

### `tracking.controller.spec.ts` (new tests)

- `DELETE /:id` calls service with parsed id and returns no body
- `DELETE /:id` with non-existent id propagates `NotFoundException`

### `tracking.service.spec.ts` (new tests)

- Deletes source successfully (calls `deleteSource` with id)
- Throws `NotFoundException` when source not found and does NOT call `deleteSource`

## Out of Scope

- Soft delete / restore
- `DELETE /api/tracking-config` (config is set, not deleted)
- Cascading deletion of related rows (tracking sources have no dependent rows today)
