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
import { TrackingFrequency } from 'src/common/constants/tracking.constant';
import { TrackingService } from './tracking.service';

export const CRON_JOB_NAME = 'tracking-source-check';

@Injectable()
export class TrackingSchedulerService implements OnModuleInit, OnModuleDestroy {
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
      this.logger.error(
        'Failed to schedule tracking check on boot',
        error as Error,
      );
    }
  }

  onModuleDestroy(): void {
    try {
      const job = this.schedulerRegistry.getCronJob(CRON_JOB_NAME);
      void job.stop();
      this.schedulerRegistry.deleteCronJob(CRON_JOB_NAME);
    } catch {
      // nothing registered — nothing to clean up
    }
  }

  async reschedule(config: TrackingConfigResponseDto): Promise<void> {
    try {
      const existing = this.schedulerRegistry.getCronJob(CRON_JOB_NAME);
      await existing.stop();
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
          const failures =
            (this.consecutiveFailures.get(result.sourceId) ?? 0) + 1;
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

export const buildCronExpression = (
  config: TrackingConfigResponseDto,
): string => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(config.runAt)) {
    throw new Error(`Invalid runAt value: ${config.runAt}`);
  }

  const [hour, minute] = config.runAt.split(':').map((part) => Number(part));

  const base = `${minute} ${hour}`;
  switch (config.frequency) {
    case TrackingFrequency.DAILY:
      return config.interval === 1
        ? `${base} * * *`
        : `${base} */${config.interval} * *`;
    case TrackingFrequency.WEEKLY:
      return `${base} * * 0`;
    case TrackingFrequency.MONTHLY:
      return `${base} 1 */${config.interval} *`;
    case TrackingFrequency.YEARLY:
      return `${base} 1 1 *`;
    default:
      throw new Error(`Unsupported frequency: ${String(config.frequency)}`);
  }
};
