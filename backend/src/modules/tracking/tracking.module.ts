import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';

@Module({
  imports: [TypeOrmModule.forFeature([TrackingSource, TrackingConfig])],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingRepository],
  exports: [TrackingRepository],
})
export class TrackingModule {}
