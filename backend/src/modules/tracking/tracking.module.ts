import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingSchedulerService } from './tracking-scheduler.service';
import { TrackingRepository } from './tracking.repository';
import { MangaModule } from '../manga/manga.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackingSource, TrackingConfig]),
    MangaModule,
    HttpModule.register({ timeout: 10000 }),
  ],
  controllers: [TrackingController],
  providers: [TrackingService, TrackingSchedulerService, TrackingRepository],
  exports: [TrackingRepository],
})
export class TrackingModule {}
