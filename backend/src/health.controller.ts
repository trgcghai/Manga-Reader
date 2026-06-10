import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongoConnection: Connection,
  ) {}

  @Get()
  getHealth() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException('PostgreSQL not initialized');
    }

    if (this.mongoConnection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException('MongoDB not connected');
    }

    return { status: 'ok', postgres: 'connected', mongodb: 'connected' };
  }
}
