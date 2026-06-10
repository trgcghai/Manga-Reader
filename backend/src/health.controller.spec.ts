import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import { ServiceUnavailableException } from '@nestjs/common';
import { Connection } from 'mongoose';
import { Cache } from 'cache-manager';

describe('HealthController', () => {
  it('returns ok when DB is initialized', async () => {
    const dataSourceMock = {
      isInitialized: true,
    } as unknown as DataSource;

    const mongoConnectionMock = {
      readyState: 1,
    } as unknown as Connection;

    const cacheManagerMock = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('ok'),
    } as unknown as Cache;

    const controller = new HealthController(
      dataSourceMock,
      mongoConnectionMock,
      cacheManagerMock,
    );

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      postgres: 'connected',
      mongodb: 'connected',
      redis: 'connected',
    });
  });

  it('throws ServiceUnavailableException when PostgreSQL is NOT initialized', async () => {
    const dataSourceMock = {
      isInitialized: false,
    } as unknown as DataSource;

    const mongoConnectionMock = {
      readyState: 1,
    } as unknown as Connection;

    const cacheManagerMock = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('ok'),
    } as unknown as Cache;

    const controller = new HealthController(
      dataSourceMock,
      mongoConnectionMock,
      cacheManagerMock,
    );

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException when MongoDB is NOT connected', async () => {
    const dataSourceMock = {
      isInitialized: true,
    } as unknown as DataSource;

    const mongoConnectionMock = {
      readyState: 0,
    } as unknown as Connection;

    const cacheManagerMock = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('ok'),
    } as unknown as Cache;

    const controller = new HealthController(
      dataSourceMock,
      mongoConnectionMock,
      cacheManagerMock,
    );

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
