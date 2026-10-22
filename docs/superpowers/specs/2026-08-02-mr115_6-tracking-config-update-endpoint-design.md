# MR115_6 — PATCH /tracking-sources/config — Update tracking config

Date: 2026-08-02
Parent: [MR115](../../../tasks/MR115.md) — TrackingSource CRUD + TrackingConfig API

## Objective

Add a partial-update endpoint for the single tracking config row. If no config row exists, create one by merging the patch payload over the default config (upsert semantics, matching the GET auto-create behavior).

## Route

`PATCH /tracking-sources/config`

The config endpoints live on `TrackingController` (class route `tracking-sources`), consistent with the MR115_5 controller-merge decision. The task's original `/api/tracking-config` route is superseded.

## Controller (`tracking.controller.ts`)

New method `updateConfig(@Body() dto: UpdateTrackingConfigDto)`:

- `@Patch('config')`
- `@ApiOperation({ summary: 'Update tracking config' })`
- `@ApiBody({ type: UpdateTrackingConfigDto })`
- `@ApiOkResponse({ type: TrackingConfigResponseDto })`
- Returns `Promise<TrackingConfigResponseDto>` from `trackingService.updateConfig(dto)`

## Service (`tracking.service.ts`)

`updateConfig(dto: UpdateTrackingConfigDto): Promise<TrackingConfigResponseDto>` — read-modify-write:

1. `const current = await this.trackingRepository.findConfig();`
2. `const base = current ?? DEFAULT_TRACKING_CONFIG;`
3. `const changes = Object.fromEntries(Object.entries(dto).filter(([, v]) => v != null));` — drops explicit `null`/`undefined` keys (the pipe's `transform: true` leaves absent fields as `undefined` on the DTO instance; a naive `{ ...base, ...dto }` would clobber base fields with `undefined` and 500 on auto-create's NOT NULL `runAt`)
4. `const merged = { frequency: base.frequency, interval: base.interval, runAt: base.runAt, ...changes };` — partial PATCH semantics; only provided fields change; `id`/`updatedAt` never enter the payload
5. `const config = await this.trackingRepository.upsertConfig(merged);` — creates if absent, otherwise updates in place
6. Map to DTO exactly like `getConfig`: `{ id, frequency, interval, runAt, updatedAt: config.updatedAt.toISOString() }`

No 404 case: upsert semantics chosen deliberately (consistent with GET auto-create).

## Validation

Already implemented in `UpdateTrackingConfigDto` (`dto/tracking-config.dto.ts`), enforced by the app-wide `ValidationPipe` → `400 Bad Request`:

- `frequency`: `@IsEnum(TrackingFrequency)` — `daily | weekly | monthly | yearly`
- `interval`: `@IsInt()` + `@Min(1)`
- `runAt`: `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/)` — `HH:mm`, e.g. `00:00`…`23:59`; `24:00` rejected
- All fields `@IsOptional()` — partial body allowed; empty `{}` is a no-op returning the current config with `200`

## Why not alternative approaches

- **Raw `upsertConfig(dto)` without defaults-merge**: `TrackingConfig.runAt` is NOT NULL with no DB default, so auto-create with a partial body would save `undefined` → 500. The service-side merge over defaults fixes exactly this.
- **Merge inside repository**: pushes partial-merge semantics into the repo layer, inconsistent with the fetch-then-update pattern already used in `updateSource`/`deleteSource`, and harder to unit test.

## Tests

### Service unit tests (`tracking.service.spec.ts`) — `updateConfig` describe block

1. Partial update preserves unspecified fields: `findConfig` resolves an existing config; `updateConfig({ frequency: 'weekly' })` calls `upsertConfig` with the existing interval/runAt intact and returns the mapped DTO.
2. Auto-create when none exists: `findConfig` resolves `null`; `updateConfig({ runAt: '23:59' })` calls `upsertConfig` with `{ ...DEFAULT_TRACKING_CONFIG, runAt: '23:59' }`.
3. Maps response DTO with `updatedAt.toISOString()`.

### Controller unit tests (`tracking.controller.spec.ts`) — `updateConfig` describe block

1. Calls `service.updateConfig` with the DTO and returns its result.
2. Propagates service errors: when `service.updateConfig` rejects (e.g. a `BadRequestException` from DTO-level validation passing through), the controller rejects with the same error.

### E2E (`test/tracking.e2e-spec.ts`) — `PATCH /tracking-sources/config` describe block

1. Updates frequency and returns updated config (`200`, fields echo, `updatedAt` present)
2. Updates interval and returns updated config
3. Updates runAt and returns updated config
4. Invalid frequency → `400`
5. `interval: 0` → `400`
6. Invalid runAt format (e.g. `"9:00"`) → `400`
7. Valid `runAt: "23:59"` → `200`
8. Invalid `runAt: "24:00"` → `400`

Reuses existing e2e scaffolding: `FileServiceMockModule`, per-test TRUNCATE of `tracking_config` (and related tables) CASCADE. Where a test asserts merge-preservation, pre-seed a config row first.

## Out of scope

- No new repository methods (`findConfig`/`upsertConfig` suffice)
- No entity or DTO changes (DTO exists from MR115_5 context and already satisfies all validation requirements)
- No changes to GET behavior or route

## Acceptance criteria

- All 8 e2e tests above pass
- Service (3) + controller (2) unit tests pass
- `GET /tracking-sources/config` still passes (unchanged)
- Swagger documents `PATCH /tracking-sources/config` with `UpdateTrackingConfigDto` body schema
- Lint clean on tracking files; `npm run build` passes
