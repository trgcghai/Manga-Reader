export enum TrackingFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export const DEFAULT_TRACKING_CONFIG = {
  frequency: TrackingFrequency.DAILY,
  interval: 1,
  runAt: '00:00',
} as const;
