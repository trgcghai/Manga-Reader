import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';

describe('HealthController', () => {
  it('returns ok when DB is initialized', () => {
    const dataSourceMock = {
      isInitialized: true,
    } as DataSource;

    const mongoConnectionMock = {
      readyState: 1,
    } as Connection;

    const controller = new HealthController(
      dataSourceMock,
      mongoConnectionMock,
    );

    expect(controller.getHealth()).toEqual({
      status: 'ok',
      postgres: 'connected',
      mongodb: 'connected',
    });
  });

  it('throws ServiceUnavailableException when PostgreSQL is NOT initialized', () => {
    const dataSourceMock = {
      isInitialized: false,
    } as DataSource;

    const mongoConnectionMock = {
      readyState: 1,
    } as Connection;

    const controller = new HealthController(
      dataSourceMock,
      mongoConnectionMock,
    );

    expect(() => controller.getHealth()).toThrow(ServiceUnavailableException);
  });

  it('throws ServiceUnavailableException when MongoDB is NOT connected', () => {
    const dataSourceMock = {
      isInitialized: true,
    } as DataSource;

    const mongoConnectionMock = {
      readyState: 0,
    } as Connection;

    const controller = new HealthController(
      dataSourceMock,
      mongoConnectionMock,
    );

    expect(() => controller.getHealth()).toThrow(ServiceUnavailableException);
  });
});
