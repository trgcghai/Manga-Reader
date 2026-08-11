import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  buildCronExpression,
  CRON_JOB_NAME,
  TrackingSchedulerService,
} from './tracking-scheduler.service';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';
import { TrackingFrequency } from 'src/common/constants/tracking.constant';
import { AggregateCheckResult, TrackingService } from './tracking.service';

describe('buildCronExpression', () => {
  const makeConfig = (
    frequency: TrackingFrequency,
    interval: number,
    runAt: string,
  ): TrackingConfigResponseDto => ({
    id: 1,
    frequency,
    interval,
    runAt,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

  it.each([
    [TrackingFrequency.DAILY, 1, '00:00', '0 0 * * *'],
    [TrackingFrequency.DAILY, 2, '08:30', '30 8 */2 * *'],
    [TrackingFrequency.WEEKLY, 2, '09:00', '0 9 * * 0'],
    [TrackingFrequency.MONTHLY, 3, '12:00', '0 12 1 */3 *'],
    [TrackingFrequency.YEARLY, 5, '00:15', '15 0 1 1 *'],
  ] as const)(
    'builds cron for %s frequency (interval %i, runAt %s): "%s"',
    (frequency, interval, runAt, expected) => {
      expect(buildCronExpression(makeConfig(frequency, interval, runAt))).toBe(
        expected,
      );
    },
  );

  describe('when runAt is not valid HH:mm', () => {
    it.each(['25:99', 'abc', '9:00'])(
      'should throw for runAt "%s"',
      (runAt) => {
        const config = makeConfig(TrackingFrequency.DAILY, 1, runAt);

        expect(() => buildCronExpression(config)).toThrow(/Invalid runAt/);
      },
    );
  });

  it('should throw for unsupported frequency', () => {
    const config = {
      id: 1,
      frequency: 'hourly',
      interval: 1,
      runAt: '00:00',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as TrackingConfigResponseDto;

    expect(() => buildCronExpression(config)).toThrow(/Unsupported frequency/);
  });
});

describe('TrackingSchedulerService', () => {
  let service: TrackingSchedulerService;
  let schedulerRegistry: {
    addCronJob: jest.Mock;
    deleteCronJob: jest.Mock;
    getCronJob: jest.Mock;
  };
  let trackingService: {
    getConfig: jest.Mock;
    checkAllSources: jest.Mock;
  };
  let registeredJobs: CronJob[];

  const config: TrackingConfigResponseDto = {
    id: 1,
    frequency: TrackingFrequency.DAILY,
    interval: 2,
    runAt: '08:30',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    registeredJobs = [];
    schedulerRegistry = {
      addCronJob: jest.fn((_name: string, job: CronJob) => {
        registeredJobs.push(job);
      }),
      deleteCronJob: jest.fn(),
      getCronJob: jest.fn(),
    };
    trackingService = {
      getConfig: jest.fn(),
      checkAllSources: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingSchedulerService,
        { provide: SchedulerRegistry, useValue: schedulerRegistry },
        { provide: TrackingService, useValue: trackingService },
      ],
    }).compile();

    service = module.get<TrackingSchedulerService>(TrackingSchedulerService);
  });

  afterEach(() => {
    for (const job of registeredJobs) {
      void job.stop();
    }
  });

  describe('onModuleInit', () => {
    it('should schedule the tracking check from the stored config on boot', async () => {
      trackingService.getConfig.mockResolvedValue(config);
      const startSpy = jest.spyOn(CronJob.prototype, 'start');

      await service.onModuleInit();

      expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(1);
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        CRON_JOB_NAME,
        expect.any(CronJob),
      );
      expect(startSpy).toHaveBeenCalled();
      startSpy.mockRestore();
    });

    it('should log an error and still boot when loading the config fails', async () => {
      const errorSpy = jest
        .spyOn(service['logger'], 'error' as never)
        .mockImplementation(() => undefined);
      trackingService.getConfig.mockRejectedValue(new Error('db down'));

      await expect(service.onModuleInit()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalled();
      expect(schedulerRegistry.addCronJob).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('reschedule', () => {
    it('should stop and remove the existing job and schedule a fresh one', async () => {
      const existingJob = { stop: jest.fn() };
      schedulerRegistry.getCronJob.mockReturnValue(existingJob);

      await service.reschedule(config);

      expect(existingJob.stop).toHaveBeenCalled();
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        CRON_JOB_NAME,
      );
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        CRON_JOB_NAME,
        expect.any(CronJob),
      );
    });

    it('should schedule when no job exists yet', async () => {
      await service.reschedule(config);

      expect(schedulerRegistry.getCronJob).toHaveBeenCalledWith(CRON_JOB_NAME);
      expect(schedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop and remove the scheduled job', () => {
      const job = { stop: jest.fn() };
      schedulerRegistry.getCronJob.mockReturnValue(job);

      service.onModuleDestroy();

      expect(job.stop).toHaveBeenCalled();
      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith(
        CRON_JOB_NAME,
      );
    });

    it('should not throw when no job is registered', () => {
      schedulerRegistry.getCronJob.mockImplementation(() => {
        throw new Error('not registered');
      });

      expect(() => service.onModuleDestroy()).not.toThrow();
      expect(schedulerRegistry.deleteCronJob).not.toHaveBeenCalled();
    });
  });

  describe('runCheck', () => {
    it('should skip an overlapping tick while a check is still running', async () => {
      trackingService.checkAllSources.mockReturnValue(
        new Promise<AggregateCheckResult[]>(() => {}),
      );

      void service.runCheck();
      await service.runCheck();

      expect(trackingService.checkAllSources).toHaveBeenCalledTimes(1);
    });

    it('should warn after 3 consecutive failures and reset the counter on success', async () => {
      const warnSpy = jest.spyOn(service['logger'], 'warn' as never);
      const failing: AggregateCheckResult[] = [
        { sourceId: 1, sourceName: 'A', url: 'u', updated: false, error: 'x' },
        { sourceId: 2, sourceName: 'B', url: 'u', updated: true },
      ];
      trackingService.checkAllSources.mockResolvedValue(failing);

      await service.runCheck();
      await service.runCheck();
      await service.runCheck();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1'));

      warnSpy.mockClear();
      trackingService.checkAllSources.mockResolvedValue([
        { sourceId: 1, sourceName: 'A', url: 'u', updated: true },
      ]);
      await service.runCheck();
      trackingService.checkAllSources.mockResolvedValue(failing);
      await service.runCheck();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should swallow a rejected check and allow the next run to proceed', async () => {
      const errorSpy = jest
        .spyOn(service['logger'], 'error' as never)
        .mockImplementation(() => undefined);
      trackingService.checkAllSources
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValue([]);

      await expect(service.runCheck()).resolves.toBeUndefined();

      expect(errorSpy).toHaveBeenCalled();

      await service.runCheck();
      expect(trackingService.checkAllSources).toHaveBeenCalledTimes(2);
      errorSpy.mockRestore();
    });
  });
});
