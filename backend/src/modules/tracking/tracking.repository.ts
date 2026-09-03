import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';

@Injectable()
export class TrackingRepository {
  constructor(
    @InjectRepository(TrackingSource)
    private readonly sourceRepo: Repository<TrackingSource>,
    @InjectRepository(TrackingConfig)
    private readonly configRepo: Repository<TrackingConfig>,
  ) {}

  // ---- TrackingSource ----

  findAllSources = async (): Promise<TrackingSource[]> => {
    return await this.sourceRepo.find();
  };

  findAllSourcesPaginated = async (
    mangaId?: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<{
    data: TrackingSource[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.sourceRepo.createQueryBuilder('source');
    qb.leftJoinAndSelect('source.manga', 'manga');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    qb.orderBy('source.id', 'ASC');

    if (mangaId) {
      qb.where('source.mangaId = :mangaId', { mangaId });
    }

    if (search) {
      qb.andWhere(
        `(LOWER(source.name) LIKE LOWER(:search)
          OR LOWER(manga.title) LIKE LOWER(:search))`,
        { search: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };

  findSourceById = async (id: number): Promise<TrackingSource | null> => {
    return await this.sourceRepo.findOne({
      where: { id },
      relations: ['manga'],
    });
  };

  findAllSourcesForCheck = async (): Promise<TrackingSource[]> => {
    return await this.sourceRepo.find({ relations: ['manga'] });
  };

  findByMangaIdForCheck = async (
    mangaId: number,
  ): Promise<TrackingSource[]> => {
    return await this.sourceRepo
      .createQueryBuilder('source')
      .leftJoinAndSelect('source.manga', 'manga')
      .where('source.mangaId = :mangaId', { mangaId })
      .getMany();
  };

  findByMangaIdAndNameExcludingId = async (
    mangaId: number,
    name: string,
    excludeId: number,
  ): Promise<TrackingSource | null> => {
    return await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.mangaId = :mangaId', { mangaId })
      .andWhere('source.name = :name', { name })
      .andWhere('source.id != :excludeId', { excludeId })
      .getOne();
  };

  findByMangaIdAndUrlExcludingId = async (
    mangaId: number,
    url: string,
    excludeId: number,
  ): Promise<TrackingSource | null> => {
    return await this.sourceRepo
      .createQueryBuilder('source')
      .where('source.mangaId = :mangaId', { mangaId })
      .andWhere('source.url = :url', { url })
      .andWhere('source.id != :excludeId', { excludeId })
      .getOne();
  };

  createSource = async (
    data: Partial<TrackingSource>,
  ): Promise<TrackingSource> => {
    return await this.sourceRepo.save(data);
  };

  updateSource = async (
    id: number,
    data: Partial<TrackingSource>,
  ): Promise<TrackingSource | null> => {
    const entity = await this.sourceRepo.findOne({
      where: { id },
      relations: ['manga'],
    });
    if (!entity) return null;
    Object.assign(entity, data);
    return await this.sourceRepo.save(entity);
  };

  deleteSource = async (id: number): Promise<boolean> => {
    const result = await this.sourceRepo.delete(id);
    return (result.affected ?? 0) > 0;
  };

  // ---- TrackingConfig ----

  findConfig = async (): Promise<TrackingConfig | null> => {
    const configs = await this.configRepo.find({ take: 1 });
    return configs[0] ?? null;
  };

  upsertConfig = async (
    data: Partial<TrackingConfig>,
  ): Promise<TrackingConfig> => {
    const existing = await this.findConfig();
    if (existing) {
      Object.assign(existing, data);
      return await this.configRepo.save(existing);
    }
    return await this.configRepo.save(data as TrackingConfig);
  };
}
