import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  it('returns ok when DB is initialized', () => {
    const dataSourceMock = {
      isInitialized: true,
    } as DataSource;

    const controller = new HealthController(dataSourceMock);

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      database: 'connected',
    });
  });

  it('throws ServiceUnavailableException when DB is NOT initialized', () => {
    const dataSourceMock = {
      isInitialized: false,
    } as DataSource;

    const controller = new HealthController(dataSourceMock);

    expect(() => controller.getHealth()).toThrow(ServiceUnavailableException);
  });
});
