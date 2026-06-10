import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { type Cache } from 'cache-manager';
import { Connection, ConnectionStates } from 'mongoose';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get()
  async getHealth() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('PostgreSQL not initialized');
    }

    if (this.mongoConnection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException('MongoDB not connected');
    }

    try {
      await this.cacheManager.set('health_check', 'ok', 5);
      await this.cacheManager.get('health_check');
    } catch (e) {
      console.error('Redis health check failed:', e);
      throw new ServiceUnavailableException('Redis not connected');
    }

    return {
      status: 'ok',
      postgres: 'connected',
      mongodb: 'connected',
      redis: 'connected',
    };
  }
}
