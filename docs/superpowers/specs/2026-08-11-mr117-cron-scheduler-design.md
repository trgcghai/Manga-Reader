# MR117 — Tracking Check Cron Scheduler: Design

Date: 2026-08-11
Source task: `tasks/MR117.md`

## Goal

Integrate `@nestjs/schedule` so the tracking module automatically runs the check-all logic on a schedule read from the `TrackingConfig` table, dynamically rescheduling whenever the config is updated via `PATCH /tracking-sources/config`.

## Decisions (brainstorming clarifications)

1. **Interval semantics:** apply `*/N` where cron can express it (daily → day-of-month, monthly → month field); ignore interval for weekly and yearly (cron cannot skip weeks/years). Honest V1 behavior.
2. **Circular dependency:** `TrackingService` ↔ `TrackingSchedulerService` resolved with `forwardRef` on both sides (no extra dependencies).
3. **Cron format:** `@nestjs/schedule` uses node-cron's 5-field format (`minute hour day-of-month month day-of-week`). The spec's 6-field table (`0 mm HH * * *`) is normalized to 5 fields.
4. Monthly runs on day 1, yearly on January 1 — the config has no day/month fields, so fixed defaults are used.

## Architecture

Approach A: a single `TrackingSchedulerService` owning dynamic scheduling, matching the spec's file list.

### Cron expression mapping (pure function)

`buildCronExpression({ frequency, interval, runAt })` — exported from `tracking-scheduler.service.ts` for direct unit testing:

| Config | Cron Expression | Notes |
| --- | --- | --- |
| daily, interval=N | `mm HH */N * *` | every N days |
| weekly, interval=N | `mm HH * * 0` | Sunday; interval ignored |
| monthly, interval=N | `mm HH 1 */N *` | day 1; every N months |
| yearly, interval=N | `mm HH 1 1 *` | January 1; interval ignored |

- `runAt` `HH:mm` (validated by DTO regex) is split on `:` and parsed as ints.
- Default config (`daily`/1/`00:00`) → `0 0 * * *`.
- Unparseable `runAt` throws; `onModuleInit` catches and logs via `Logger.error`.

### TrackingSchedulerService (new file)

- `implements OnModuleInit, OnModuleDestroy`; `private readonly logger = new Logger(TrackingSchedulerService.name)`.
- Constant cron name: `tracking-source-check`.
- Constructor: `trackingService: TrackingService` injected via `@Inject(forwardRef(() => TrackingService))`.
- `onModuleInit()`:
  1. `const config = await this.trackingService.getConfig()` (reuses default-config auto-creation).
  2. `await this.reschedule(config)` wrapped in try/catch → `logger.error` on failure (app must still boot).
- `reschedule(config)`:
  1. If a cron with the name already exists: `getCronJob(name).stop()` + `SchedulerRegistry.deleteCronJob(name)`.
  2. `const expression = buildCronExpression(config)`.
  3. `const job = new CronJob(expression, () => void this.runCheck())`.
  4. `SchedulerRegistry.addCronJob(name, job)`; `job.start()` (node-cron requires explicit start).
  5. `logger.log('Scheduled tracking check: <expression>')`.
- `onModuleDestroy()`: stop + delete the cron if registered.
- `runCheck()` (tick handler):
  1. If `isRunning` → `logger.warn('Skipping overlapping tracking check')` and return.
  2. `isRunning = true`; `logger.log('Tracking check started')`.
  3. `const results = await this.trackingService.checkAllSources()`.
  4. Compute summary: count of `updated: true` and count of entries with `error`; `logger.log` summary.
  5. Failure tracking: `Map<number, number>` keyed by `sourceId` — entries with `error` increment, entries without reset to 0; `logger.warn` when a source reaches 3 consecutive failures.
  6. `catch (error)` → `logger.error` with the error; rethrow NOT performed (a failed tick must not kill the process).
  7. `finally { isRunning = false }`.

### Wiring

- `tracking.module.ts`: add `TrackingSchedulerService` to `providers`.
- `tracking.service.ts`:
  - Constructor gains `trackingSchedulerService: TrackingSchedulerService` injected via `@Inject(forwardRef(() => TrackingSchedulerService))`.
  - `updateConfig(dto)`: after `upsertConfig`, map the merged config to the response shape and `await this.trackingSchedulerService.reschedule(response)`.
- `app.module.ts`: add `ScheduleModule.forRoot()` to imports.
- `backend/package.json`: add `@nestjs/schedule`.

### Error handling summary

| Condition | Behavior |
| --- | --- |
| No config row at boot | `getConfig` auto-creates `DEFAULT_TRACKING_CONFIG`; scheduler uses it |
| Overlapping tick (previous run still executing) | Skipped with `logger.warn` |
| Source fails in a check | Failure counter increments; `logger.warn` at ≥3 consecutive; reset on success |
| Tick throws (unexpected) | `logger.error`; per-source counters untouched (no results to process); `isRunning` cleared in `finally` |
| `reschedule` fails during config PATCH | Exception propagates to the PATCH handler (config was already persisted) |
| App shutdown | Cron stopped + deleted |

### Testing

- `buildCronExpression` (in scheduler spec): all four frequencies × interval 1 and N>1; default config → `0 0 * * *`; invalid runAt throws.
- Scheduler spec (mock `SchedulerRegistry` with `addCronJob`/`deleteCronJob`/`getCronJob`; mock `TrackingService` with `getConfig`/`checkAllSources`):
  - `onModuleInit` schedules the cron from DB config (addCronJob called with CronJob; start invoked).
  - `reschedule` deletes existing then adds new.
  - `onModuleDestroy` deletes the cron.
  - Concurrent tick skipped: `checkAllSources` returns an unresolved promise; invoke tick twice; assert `checkAllSources` called once.
  - Failure counter: results with errors → warns at 3 consecutive; success resets.
  - Tick error → `logger.error` path (mock `checkAllSources` rejection; no throw to caller).
- `tracking.service.spec.ts`: add `trackingSchedulerService: { reschedule: jest.fn() }` mock to the module providers; `updateConfig` tests assert `reschedule` called with the merged response config.
- Verification: full `npm test` (34 suites green), `npm run build`, `test:e2e` (app boots with `ScheduleModule.forRoot()` registered — acceptance "application starts without error").

## Files to create

- `backend/src/modules/tracking/tracking-scheduler.service.ts`
- `backend/src/modules/tracking/tracking-scheduler.service.spec.ts`

## Files to change

- `backend/package.json` — add `@nestjs/schedule`
- `backend/src/app.module.ts` — `ScheduleModule.forRoot()`
- `backend/src/modules/tracking/tracking.module.ts` — provide scheduler
- `backend/src/modules/tracking/tracking.service.ts` — forwardRef injection + `reschedule` call in `updateConfig`
- `backend/src/modules/tracking/tracking.service.spec.ts` — scheduler mock + reschedule assertions

## Out of scope

- Persisting/auto-disabling sources after N failures (future task; V1 only logs).
- Job persistence across restarts (V1 re-schedules from DB config at boot, which covers it).
- Interval semantics for weekly/yearly (ignored, per clarification).
- Frontend scheduling UI.