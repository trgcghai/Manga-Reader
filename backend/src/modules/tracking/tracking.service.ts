import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TrackingRepository } from './tracking.repository';
import { MangaRepository } from '../manga/repositories/manga.repository';
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
import {
  UpdateTrackingConfigDto,
  TrackingConfigResponseDto,
} from './dto/tracking-config.dto';
import { TrackingSource } from './entities/tracking-source.entity';
import { DEFAULT_TRACKING_CONFIG } from 'src/common/constants/tracking.constant';

@Injectable()
export class TrackingService {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly mangaRepository: MangaRepository,
  ) {}

  private toTrackingSourceResponseDto = (
    source: TrackingSource,
  ): TrackingSourceResponseDto => {
    return {
      id: source.id,
      mangaId: source.manga.id,
      url: source.url,
      name: source.name,
      latestChapterNumber: source.latestChapterNumber,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      manga: { id: source.manga.id, title: source.manga.title },
    };
  };

  createSource = async (
    dto: CreateTrackingSourceDto,
  ): Promise<TrackingSourceResponseDto> => {
    const manga = await this.mangaRepository.findOneById(dto.mangaId);
    if (!manga) {
      throw new NotFoundException(`Manga with ID ${dto.mangaId} not found`);
    }

    const existingSources = await this.trackingRepository.findAllSources();

    const duplicateName = existingSources.find(
      (s) => s.manga?.id === dto.mangaId && s.name === dto.name,
    );
    if (duplicateName) {
      throw new ConflictException(
        `Tracking source with name "${dto.name}" already exists for this manga`,
      );
    }

    const duplicateUrl = existingSources.find(
      (s) => s.manga?.id === dto.mangaId && s.url === dto.url,
    );
    if (duplicateUrl) {
      throw new ConflictException(
        `Tracking source with URL "${dto.url}" already exists for this manga`,
      );
    }

    const source = await this.trackingRepository.createSource({
      manga,
      url: dto.url,
      name: dto.name,
    });

    return this.toTrackingSourceResponseDto(source);
  };

  findAllSources = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) => {
    const term = search?.trim() || undefined;
    const result = await this.trackingRepository.findAllSourcesPaginated(
      mangaId,
      page,
      limit,
      term,
    );

    return {
      ...result,
      data: result.data.map((source) =>
        this.toTrackingSourceResponseDto(source),
      ),
    };
  };

  updateSource = async (
    id: number,
    dto: UpdateTrackingSourceDto,
  ): Promise<TrackingSourceResponseDto> => {
    const source = await this.trackingRepository.findSourceById(id);
    if (!source) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }

    if (dto.name) {
      const duplicateName =
        await this.trackingRepository.findByMangaIdAndNameExcludingId(
          source.manga.id,
          dto.name,
          id,
        );
      if (duplicateName) {
        throw new ConflictException(
          `Tracking source with name "${dto.name}" already exists for this manga`,
        );
      }
    }

    if (dto.url) {
      const duplicateUrl =
        await this.trackingRepository.findByMangaIdAndUrlExcludingId(
          source.manga.id,
          dto.url,
          id,
        );
      if (duplicateUrl) {
        throw new ConflictException(
          `Tracking source with URL "${dto.url}" already exists for this manga`,
        );
      }
    }

    const updated = await this.trackingRepository.updateSource(id, {
      ...(dto.name ? { name: dto.name } : {}),
      ...(dto.url ? { url: dto.url } : {}),
    });

    if (!updated) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }

    return this.toTrackingSourceResponseDto(updated);
  };

  deleteSource = async (id: number): Promise<void> => {
    const source = await this.trackingRepository.findSourceById(id);
    if (!source) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }
    await this.trackingRepository.deleteSource(id);
  };

  getConfig = async (): Promise<TrackingConfigResponseDto> => {
    let config = await this.trackingRepository.findConfig();
    if (!config) {
      config = await this.trackingRepository.upsertConfig(
        DEFAULT_TRACKING_CONFIG,
      );
    }

    return {
      id: config.id,
      frequency: config.frequency,
      interval: config.interval,
      runAt: config.runAt,
      updatedAt: config.updatedAt.toISOString(),
    };
  };

  updateConfig = async (
    dto: UpdateTrackingConfigDto,
  ): Promise<TrackingConfigResponseDto> => {
    const current = await this.trackingRepository.findConfig();
    const base = current ?? DEFAULT_TRACKING_CONFIG;

    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value != null),
    );
    const merged = {
      frequency: base.frequency,
      interval: base.interval,
      runAt: base.runAt,
      ...changes,
    };

    const config = await this.trackingRepository.upsertConfig(merged);

    return {
      id: config.id,
      frequency: config.frequency,
      interval: config.interval,
      runAt: config.runAt,
      updatedAt: config.updatedAt.toISOString(),
    };
  };
}
