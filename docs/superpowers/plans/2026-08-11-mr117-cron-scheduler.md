# MR117 — Tracking Check Cron Scheduler: Implementation Plan

Date: 2026-08-11
Spec: `docs/superpowers/specs/2026-08-11-mr117-cron-scheduler-design.md`
Branch: `feature/mr117-tracking-scheduler`

## Prerequisites

- `npm install @nestjs/schedule` (v5, compatible with Nest 11; brings `cron` package as its own dependency) in `backend/`.

## Task 1 — Register ScheduleModule at the app root

**Related skills:** nestjs-best-practices

**Acceptance criteria:** `ScheduleModule.forRoot()` is imported in `backend/src/app.module.ts`; `npm run build` passes.

Steps:
1. `cd backend && npm install @nestjs/schedule`.
2. Add to `app.module.ts` imports (after `ThrottlerModule`): `ScheduleModule.forRoot()` with import `import { ScheduleModule } from '@nestjs/schedule';`.
3. Run `npm run build` — must pass.

Notes: We use only dynamic scheduling (`SchedulerRegistry`); no `@Cron` decorators, so `ScheduleModule.forRoot()` is a pure no-op during module scan in tests.

## Task 2 — TDD: `buildCronExpression` pure function

**Related skills:** test-driven-development, vitest, javascript-typescript-jest, nestjs-best-practices

**Acceptance criteria:** `backend/src/modules/tracking/tracking-scheduler.service.ts` exports `buildCronExpression(config: TrackingConfigResponseDto): string`; spec at `tracking-scheduler.service.spec.ts` covers all rows of the mapping table below plus error case; tests green.

### TDD step 1 — failing spec

Create `backend/src/modules/tracking/tracking-scheduler.service.spec.ts` with the red table from the design:

| frequency | interval | runAt | expected cron |
| --- | --- | --- | --- |
| daily | 1 | `00:00` | `0 0 * * *` |
| daily | 2 | `08:30` | `30 8 */2 * *` |
| weekly | 2 | `09:00` | `0 9 * * 0` |
| monthly | 3 | `12:00` | `0 12 1 */3 *` |
| yearly | 5 | `00:15` | `15 0 1 1 *` |

Plus: unparseable `runAt` (`'25:99'`, `'abc'`) throws `Error`.

Import the function from `./tracking-scheduler.service` — file does not exist yet, so test run fails (red).

### TDD step 2 — implementation

Create `backend/src/modules/tracking/tracking-scheduler.service.ts` containing only:

```typescript
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';

export const buildCronExpression = (
  config: TrackingConfigResponseDto,
): string => {
  const [hour, minute] = config.runAt.split(':').map((part) => Number(part));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error(`Invalid runAt value: ${config.runAt}`);
  }

  const base = `${minute} ${hour}`;
  switch (config.frequency) {
    case 'daily':
      return `${base} */${config.interval} * *`;
    case 'weekly':
      return `${base} * * 0`;
    case 'monthly':
      return `${base} 1 */${config.interval} *`;
    case 'yearly':
      return `${base} 1 1 *`;
  }
};
```

### TDD step 3 — green

`npm test -- --run` passes for the new spec (run targeted spec first, then suite later in Task 5).

## Task 3 — TDD: `TrackingSchedulerService` class

**Related skills:** test-driven-development, vitest, javascript-typescript-jest, nestjs-best-practices, nestjs-testing

**Acceptance criteria:** class added to the file created in Task 2; lifecycle (`onModuleInit`/`onModuleDestroy`), `reschedule`, and `runCheck` covered by unit tests; suite green.

### TDD step 1 — failing spec

Extend `tracking-scheduler.service.spec.ts` with a `describe('TrackingSchedulerService')` block using:

- `SchedulerRegistry` mock: `{ provide: SchedulerRegistry, useValue: { addCronJob: jest.fn(), deleteCronJob: jest.fn(), getCronJob: jest.fn() } }` (injectable provider via Nest `Test` module).
- `TrackingService` mock: `getConfig`, `checkAllSources` as `jest.fn()`.
- Real `CronJob` instances (no timers fire within test lifetime).

Test cases (red first — class doesn't exist):

1. `onModuleInit` — `getConfig` resolves `{ frequency: 'daily', interval: 2, runAt: '08:30' }`; assert `addCronJob` called once with name `tracking-source-check`, and the added `CronJob` instance has `start()` invoked.
2. `onModuleInit` with `getConfig` rejecting — `logger.error` path, no throw (module still boots).
3. `reschedule` — existing job present (`getCronJob` returns a stub CronJob): assert `stop()` and `deleteCronJob` called before `addCronJob`.
4. `onModuleDestroy` — `getCronJob` returns job: assert `stop()` + `deleteCronJob`; when no job registered: neither called.
5. Overlapping tick — `checkAllSources` returns a promise that never resolves; call `runCheck()` twice; assert `checkAllSources` called exactly once.
6. Failure counter — first tick returns results with 2 error entries and 1 success; second tick: same 2 sources error → warning logged at 3 consecutive (third tick) — assert `logger.warn` called with failure warning for the right `sourceId`s; a successful result for a source resets its counter.
7. Tick rejection — `checkAllSources` rejects; assert no exception escapes `runCheck()` and `isRunning` resets (subsequent tick calls `checkAllSources` again).

Assertions on logs: use `jest.spyOn(logger, 'error' as any).mockImplementation()` pattern if logger isn't injectable; keep to at most one spy helper.

### TDD step 2 — implementation

Add to `tracking-scheduler.service.ts`:

```typescript
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { CronJob } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';
import { TrackingService } from './tracking.service';

export const CRON_JOB_NAME = 'tracking-source-check';

@Injectable()
export class TrackingSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(TrackingSchedulerService.name);
  private isRunning = false;
  private readonly consecutiveFailures = new Map<number, number>();

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => TrackingService))
    private readonly trackingService: TrackingService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const config = await this.trackingService.getConfig();
      await this.reschedule(config);
    } catch (error) {
      this.logger.error('Failed to schedule tracking check on boot', error as Error);
    }
  }

  onModuleDestroy(): void {
    try {
      const job = this.schedulerRegistry.getCronJob(CRON_JOB_NAME);
      job.stop();
      this.schedulerRegistry.deleteCronJob(CRON_JOB_NAME);
    } catch {
      // nothing registered — nothing to clean up
    }
  }

  async reschedule(config: TrackingConfigResponseDto): Promise<void> {
    try {
      const existing = this.schedulerRegistry.getCronJob(CRON_JOB_NAME);
      existing.stop();
      this.schedulerRegistry.deleteCronJob(CRON_JOB_NAME);
    } catch {
      // first scheduling
    }

    const expression = buildCronExpression(config);
    const job = new CronJob(expression, () => void this.runCheck());
    this.schedulerRegistry.addCronJob(CRON_JOB_NAME, job);
    job.start();
    this.logger.log(`Scheduled tracking check: ${expression}`);
  }

  async runCheck(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Skipping overlapping tracking check');
      return;
    }
    this.isRunning = true;
    try {
      this.logger.log('Tracking check started');
      const results = await this.trackingService.checkAllSources();
      const updated = results.filter((result) => result.updated).length;
      const errored = results.filter((result) => result.error).length;
      this.logger.log(
        `Tracking check finished: ${updated} updated, ${errored} errored, ${results.length} total`,
      );
      for (const result of results) {
        if (result.error) {
          const failures = (this.consecutiveFailures.get(result.sourceId) ?? 0) + 1;
          this.consecutiveFailures.set(result.sourceId, failures);
          if (failures >= 3) {
            this.logger.warn(
              `Source ${result.sourceId} (${result.sourceName}) failed ${failures} consecutive checks`,
            );
          }
        } else {
          this.consecutiveFailures.delete(result.sourceId);
        }
      }
    } catch (error) {
      this.logger.error('Tracking check failed', error as Error);
    } finally {
      this.isRunning = false;
    }
  }
}
```

### TDD step 3 — green

Targeted run passes: `npx jest tracking-scheduler`.

## Task 4 — Wire scheduler into tracking module and `updateConfig`

**Related skills:** nestjs-best-practices, nestjs-testing, test-driven-development, vitest, tanstack-query-best-practices (not applicable — backend-only; listed for completeness)

**Acceptance criteria:** `TrackingModule` provides `TrackingSchedulerService`; `TrackingService.updateConfig` calls `await this.trackingSchedulerService.reschedule(response)` after persisting; existing + new unit tests green.

Steps:
1. `tracking.module.ts` — add `TrackingSchedulerService` to `providers`.
2. `tracking.service.ts`:
   - Import `Inject`, `forwardRef` from `@nestjs/common`, and `TrackingSchedulerService`.
   - Constructor gains 4th param: `@Inject(forwardRef(() => TrackingSchedulerService)) private readonly trackingSchedulerService: TrackingSchedulerService`.
   - In `updateConfig`, after building the response object (current code lines ~347-352), add `await this.trackingSchedulerService.reschedule(response)` before returning it.
3. `tracking.service.spec.ts` — add provider `{ provide: TrackingSchedulerService, useValue: { reschedule: jest.fn() } }` to the existing `Test` module; in existing `updateConfig` tests, assert `reschedule` was called with the exact merged response (`frequency`, `interval`, `runAt` matching the DTO changes).
4. Run `npx jest tracking` — all tracking specs green.

## Task 5 — Full verification

**Related skills:** verification-before-completion

Acceptance criteria — all pass with evidence (paste output):

1. `cd backend && npm run lint`
2. `cd backend && npm run test` (full suite, all 34+ suites green)
3. `cd backend && npm run build`
4. `cd backend && npm run test:e2e` (acceptance: app boots with `ScheduleModule.forRoot()` registered; scheduler `onModuleInit` runs against real DB and logs scheduled expression)

## Out of scope (from spec)

- Source auto-disable, job persistence beyond boot re-scheduling, weekly/yearly interval semantics, frontend UI.