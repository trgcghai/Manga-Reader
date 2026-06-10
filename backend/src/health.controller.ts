import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  getHealth() {
    if (!this.dataSource.isInitialized) {
      throw new ServiceUnavailableException(
        'Database connection is not initialized',
      );
    }

    return { status: 'ok', database: 'connected' };
  }
}
