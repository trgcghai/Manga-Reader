import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';
import { TrackingController } from './tracking.controller';
import { TrackingConfigController } from './tracking-config.controller';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { MangaModule } from '../manga/manga.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TrackingSource, TrackingConfig]),
    MangaModule,
  ],
  controllers: [TrackingController, TrackingConfigController],
  providers: [TrackingService, TrackingRepository],
  exports: [TrackingRepository],
})
export class TrackingModule {}
