import { INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { HealthController } from '../src/health.controller';

describe('Health endpoint (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: {
            isInitialized: true,
          },
        },
        {
          provide: getConnectionToken(),
          useValue: {
            readyState: 1,
          },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue('ok'),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({
      status: 'ok',
      postgres: 'connected',
      mongodb: 'connected',
      redis: 'connected',
    });
  });
});
