import { TrackingConfigResponseDto } from './dto/tracking-config.dto';
import { TrackingFrequency } from 'src/common/constants/tracking.constant';

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
