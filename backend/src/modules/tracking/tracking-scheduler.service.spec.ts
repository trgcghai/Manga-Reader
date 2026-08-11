import { buildCronExpression } from './tracking-scheduler.service';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';
import { TrackingFrequency } from 'src/common/constants/tracking.constant';

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
