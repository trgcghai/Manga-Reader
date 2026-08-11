import {
  BadGatewayException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import axios from 'axios';
import { HttpService } from '@nestjs/axios';
import { TrackingRepository } from './tracking.repository';
import { TrackingSchedulerService } from './tracking-scheduler.service';
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
import { JsonPathExtractor } from './extractors/json-path-extractor';
import { DEFAULT_TRACKING_CONFIG } from 'src/common/constants/tracking.constant';

export type CheckResult =
  | { updated: true; previous: string; current: string; mangaId: number }
  | { updated: false; current: string };

export type AggregateCheckResult = {
  sourceId: number;
  sourceName: string;
  url: string;
  updated: boolean;
  previous?: string;
  current?: string;
  error?: string;
};

@Injectable()
export class TrackingService {
  constructor(
    private readonly trackingRepository: TrackingRepository,
    private readonly mangaRepository: MangaRepository,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => TrackingSchedulerService))
    private readonly trackingSchedulerService: TrackingSchedulerService,
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
      extractorPath: source.extractorPath ?? null,
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
      ...(dto.extractorPath !== undefined
        ? { extractorPath: dto.extractorPath }
        : {}),
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
      ...(dto.extractorPath !== undefined
        ? { extractorPath: dto.extractorPath }
        : {}),
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

  checkSource = async (id: number): Promise<CheckResult> => {
    const source = await this.trackingRepository.findSourceById(id);
    if (!source) {
      throw new NotFoundException(`Tracking source with ID ${id} not found`);
    }
    return this.performSourceCheck(source);
  };

  private performSourceCheck = async (
    source: TrackingSource,
  ): Promise<CheckResult> => {
    let body: unknown;
    try {
      const response = await this.httpService.axiosRef.get(source.url);
      body =
        typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new UnprocessableEntityException('Response parsing failed');
      }
      if (
        axios.isAxiosError(error) &&
        error.response &&
        error.response.status >= 400 &&
        error.response.status < 500
      ) {
        throw new UnprocessableEntityException(
          `Source responded with status ${error.response.status}`,
        );
      }
      throw new BadGatewayException(`Source URL is unreachable: ${source.url}`);
    }

    const extractor = new JsonPathExtractor(source.extractorPath);
    const current = extractor.extract(body);
    if (current === null) {
      throw new UnprocessableEntityException('Response parsing failed');
    }

    const previous = source.latestChapterNumber;
    const comparison = this.compareChapterNumbers(previous, current);
    if (comparison !== 'newer') {
      return { updated: false, current };
    }

    await this.trackingRepository.updateSource(source.id, {
      latestChapterNumber: current,
    });
    return {
      updated: true,
      previous,
      current,
      mangaId: source.manga.id,
    };
  };

  private compareChapterNumbers = (
    previous: string | null,
    current: string,
  ): 'newer' | 'same' | 'different' => {
    const prevNum = previous === null ? NaN : parseFloat(previous);
    const currentNum = parseFloat(current);
    if (Number.isFinite(prevNum) && Number.isFinite(currentNum)) {
      if (currentNum > prevNum) return 'newer';
      if (currentNum === prevNum) return 'same';
      return 'different';
    }
    return current === previous ? 'same' : 'different';
  };

  checkMangaSources = async (
    mangaId: number,
  ): Promise<AggregateCheckResult[]> => {
    const manga = await this.mangaRepository.findOneById(mangaId);
    if (!manga) {
      throw new NotFoundException(`Manga with ID ${mangaId} not found`);
    }

    const sources =
      await this.trackingRepository.findByMangaIdForCheck(mangaId);
    return this.performAggregateCheck(sources);
  };

  checkAllSources = async (): Promise<AggregateCheckResult[]> => {
    const sources = await this.trackingRepository.findAllSourcesForCheck();
    return this.performAggregateCheck(sources);
  };

  private performAggregateCheck = async (
    sources: TrackingSource[],
  ): Promise<AggregateCheckResult[]> => {
    const settled = await Promise.allSettled(
      sources.map(async (source) => {
        const result = await this.performSourceCheck(source);
        return {
          sourceId: source.id,
          sourceName: source.name,
          url: source.url,
          updated: result.updated,
          ...(result.updated
            ? { previous: result.previous, current: result.current }
            : { current: result.current }),
        };
      }),
    );

    return settled.map((entry, index) => {
      const source = sources[index];
      if (entry.status === 'fulfilled') {
        return entry.value;
      }
      const reason =
        entry.reason instanceof Error
          ? entry.reason.message
          : String(entry.reason);
      return {
        sourceId: source.id,
        sourceName: source.name,
        url: source.url,
        updated: false,
        error: reason,
      };
    });
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

    const response = {
      id: config.id,
      frequency: config.frequency,
      interval: config.interval,
      runAt: config.runAt,
      updatedAt: config.updatedAt.toISOString(),
    };

    await this.trackingSchedulerService.reschedule(response);
    return response;
  };
}
