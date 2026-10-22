# MR115_5 — GET /tracking-config Get Tracking Config Endpoint

## Overview

Add a `GET /tracking-config` endpoint that returns the current tracking config. If no config row exists, create one with defaults `{ frequency: "DAILY", interval: 1, runAt: "00:00" }` and return it. Always returns `200` with `TrackingConfigResponseDto`.

## Design Decisions

- **Defaults as a service-level constant** — `DEFAULT_TRACKING_CONFIG` in `tracking.constant.ts` is the single source of truth, shared with MR115_6's PATCH logic. Explicit and testable. The entity's `runAt` column has no DB default (NOT NULL), so the service must pass `runAt` explicitly — the constant guarantees this.
- **New `TrackingConfigController`** — the existing `TrackingController` is scoped to `@Controller('tracking-sources')`; config routes need their own base path. A dedicated controller mirrors the established pattern and is reused by MR115_6's `PATCH /tracking-config`.
- **Reuse existing repository methods** — `findConfig()` returns the first config row or null; `upsertConfig(data)` creates when none exists. No repository changes needed.
- **Singleton-style config** — the feature treats config as a single row (create on first GET, update in place via PATCH). If multiple rows exist (e.g., manual DB edits), `findConfig` returns the first; accepted behavior, documented here.
- **Response mapping** — entity mapped to `TrackingConfigResponseDto` (`updatedAt.toISOString()`), matching the existing source response mapping style. No `createdAt` in DTO (config is updated in-place).

## Request

```
GET /tracking-config
```

## Responses

| Status | Body | Condition |
|--------|------|-----------|
| `200` | `TrackingConfigResponseDto` | Config exists (or was just auto-created) |

## Modified Files

### `constants/tracking.constant.ts`

Add:

```typescript
export const DEFAULT_TRACKING_CONFIG = {
  frequency: TrackingFrequency.DAILY,
  interval: 1,
  runAt: '00:00',
} as const;
```

### `tracking.service.ts`

Add `getConfig(): Promise<TrackingConfigResponseDto>`:

1. `const config = await this.trackingRepository.findConfig()`
2. If null: `config = await this.trackingRepository.upsertConfig(DEFAULT_TRACKING_CONFIG)`
3. Return mapped `TrackingConfigResponseDto` with `updatedAt: config.updatedAt.toISOString()`

### `tracking-config.controller.ts` (new)

`@Controller('tracking-config')` with a single `@Get()` handler:

- `@ApiOperation({ summary: 'Get tracking config' })`
- `@ApiOkResponse({ type: TrackingConfigResponseDto })`
- Delegates to `trackingService.getConfig()`

### `tracking.module.ts`

Register `TrackingConfigController` in the `controllers` array.

### `tracking.service.spec.ts` (new tests)

- Returns existing config mapped to DTO (asserts `findConfig` called, `upsertConfig` NOT called)
- Auto-creates default config when none exists (asserts `upsertConfig` called with defaults, result has `frequency: 'daily'`, `interval: 1`, `runAt: '00:00'`)

### `tracking-config.controller.spec.ts` (new tests)

- Returns DTO from service (asserts `getConfig` called)

### `test/tracking.e2e-spec.ts` (extend, per MR115_4 review convention)

- `GET /tracking-config` returns 200 with config when one exists (seed via repo, assert shape: id, frequency, interval, runAt, updatedAt)
- `GET /tracking-config` auto-creates and returns default config when table is empty (assert `frequency: 'daily'`, `interval: 1`, `runAt: '00:00'`)

## Out of Scope

- `PATCH /tracking-config` (MR115_6)
- Cron/scheduling logic
- Multiple-config-row cleanup
