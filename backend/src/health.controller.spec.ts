import { ServiceUnavailableException } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Connection } from 'mongoose';
import { DataSource } from 'typeorm';
import { FileService } from './modules/file/file.service';
import { HealthController } from './health.controller';

function createController(options?: {
  postgresInitialized?: boolean;
  mongoReadyState?: number;
  storageCheck?: jest.Mock;
}) {
  const cacheManagerMock = {
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue('ok'),
  } as unknown as Cache;
  const storageCheck =
    options?.storageCheck ?? jest.fn().mockResolvedValue(undefined);
  const fileServiceMock = {
    checkStorageAccess: storageCheck,
  } as unknown as FileService;
  const controller = new HealthController(
    { isInitialized: options?.postgresInitialized ?? true } as unknown as DataSource,
    { readyState: options?.mongoReadyState ?? 1 } as unknown as Connection,
    cacheManagerMock,
    fileServiceMock,
  );
  return { controller, storageCheck };
}

describe('HealthController', () => {
  it('returns ok when all dependencies are available', async () => {
    const { controller, storageCheck } = createController();

    await expect(controller.getHealth()).resolves.toEqual({
      status: 'ok',
      postgres: 'connected',
      mongodb: 'connected',
      redis: 'connected',
      storage: 'connected',
    });
    expect(storageCheck).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceUnavailableException when PostgreSQL is not initialized', async () => {
    const { controller } = createController({ postgresInitialized: false });

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws ServiceUnavailableException when MongoDB is not connected', async () => {
    const { controller } = createController({ mongoReadyState: 0 });

    await expect(controller.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns a generic unavailable error when storage access fails', async () => {
    const storageCheck = jest
      .fn()
      .mockRejectedValue(new Error('AccessDenied: sensitive provider details'));
    const { controller } = createController({ storageCheck });

    const error = await controller.getHealth().then(
      () => undefined,
      (rejection: unknown) => rejection,
    );
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    const exception = error as ServiceUnavailableException;
    expect(exception.getStatus()).toBe(503);
    expect(exception.message).toBe('Object storage not connected');
    expect(exception.message).not.toContain('AccessDenied');
    expect(storageCheck).toHaveBeenCalledTimes(1);
  });
});
