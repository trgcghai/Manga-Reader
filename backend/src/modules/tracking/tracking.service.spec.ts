/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { MangaRepository } from '../manga/repositories/manga.repository';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TrackingService', () => {
  let service: TrackingService;
  let trackingRepo: jest.Mocked<TrackingRepository>;
  let mangaRepo: jest.Mocked<MangaRepository>;

  const mockManga = { id: 1, title: 'One Piece' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        {
          provide: TrackingRepository,
          useValue: {
            findAllSources: jest.fn(),
            findAllSourcesPaginated: jest.fn(),
            createSource: jest.fn(),
            findSourceById: jest.fn(),
            findByMangaIdAndNameExcludingId: jest.fn(),
            findByMangaIdAndUrlExcludingId: jest.fn(),
            updateSource: jest.fn(),
          },
        },
        {
          provide: MangaRepository,
          useValue: {
            findOneById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    trackingRepo = module.get(TrackingRepository);
    mangaRepo = module.get(MangaRepository);
  });

  describe('getStatus', () => {
    it('should return module status with timestamp', () => {
      const result = service.getStatus();
      expect(result.status).toBe('ok');
      expect(result.module).toBe('tracking');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('createSource', () => {
    const dto = {
      mangaId: 1,
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
    };

    it('should create a tracking source successfully', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([]);
      trackingRepo.createSource.mockResolvedValue({
        id: 1,
        manga: mockManga,
        url: dto.url,
        name: dto.name,
        latestChapterNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createSource(dto);

      expect(result.mangaId).toBe(1);
      expect(result.name).toBe('MangaDex');
      expect(result.latestChapterNumber).toBeNull();
      expect(mangaRepo.findOneById).toHaveBeenCalledWith(1);
      expect(trackingRepo.createSource).toHaveBeenCalled();
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      mangaRepo.findOneById.mockResolvedValue(null);

      await expect(service.createSource(dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, name) is duplicate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([
        { manga: { id: 1 }, name: 'MangaDex', url: 'https://other.com' } as any,
      ]);

      await expect(service.createSource(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, url) is duplicate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([
        {
          manga: { id: 1 },
          name: 'Other',
          url: 'https://example.com/manga/one-piece',
        } as any,
      ]);

      await expect(service.createSource(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });
  });

  describe('findAllSources', () => {
    const mockSource = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return paginated sources', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [mockSource] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.findAllSources();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
      );
    });

    it('should filter by mangaId', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [mockSource] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      await service.findAllSources(1);

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        1,
        1,
        20,
      );
    });

    it('should respect page and limit params', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });

      const result = await service.findAllSources(undefined, 2, 5);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        2,
        5,
      );
    });

    it('should return empty data when no results', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      const result = await service.findAllSources();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('updateSource', () => {
    const existingSource = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateDto = { name: 'MangaPlus' };

    it('should update name and return updated DTO', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndNameExcludingId.mockResolvedValue(null);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        name: 'MangaPlus',
      } as any);

      const result = await service.updateSource(1, updateDto);

      expect(result.name).toBe('MangaPlus');
      expect(result.latestChapterNumber).toBe('100');
      expect(trackingRepo.findSourceById).toHaveBeenCalledWith(1);
      expect(trackingRepo.findByMangaIdAndNameExcludingId).toHaveBeenCalledWith(
        1,
        'MangaPlus',
        1,
      );
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        name: 'MangaPlus',
      });
    });

    it('should update url and return updated DTO', async () => {
      const urlDto = { url: 'https://example.com/manga/one-piece-v2' };
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndUrlExcludingId.mockResolvedValue(null);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        url: 'https://example.com/manga/one-piece-v2',
      } as any);

      const result = await service.updateSource(1, urlDto);

      expect(result.url).toBe('https://example.com/manga/one-piece-v2');
      expect(trackingRepo.findByMangaIdAndUrlExcludingId).toHaveBeenCalledWith(
        1,
        'https://example.com/manga/one-piece-v2',
        1,
      );
    });

    it('should NOT reset latestChapterNumber', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndNameExcludingId.mockResolvedValue(null);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        name: 'MangaPlus',
        latestChapterNumber: '100',
      } as any);

      const result = await service.updateSource(1, updateDto);

      expect(result.latestChapterNumber).toBe('100');
    });

    it('should throw NotFoundException when source does not exist', async () => {
      trackingRepo.findSourceById.mockResolvedValue(null);

      await expect(service.updateSource(999, updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, name) conflicts', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndNameExcludingId.mockResolvedValue({
        id: 2,
        manga: { id: 1 },
        name: 'MangaPlus',
      } as any);

      await expect(service.updateSource(1, updateDto)).rejects.toThrow(
        ConflictException,
      );
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, url) conflicts', async () => {
      const urlDto = { url: 'https://example.com/manga/one-piece-v2' };
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.findByMangaIdAndUrlExcludingId.mockResolvedValue({
        id: 2,
        manga: { id: 1 },
        url: 'https://example.com/manga/one-piece-v2',
      } as any);

      await expect(service.updateSource(1, urlDto)).rejects.toThrow(
        ConflictException,
      );
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should skip duplicate checks when name/url not provided', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.updateSource.mockResolvedValue(existingSource as any);

      await service.updateSource(1, {});

      expect(
        trackingRepo.findByMangaIdAndNameExcludingId,
      ).not.toHaveBeenCalled();
      expect(
        trackingRepo.findByMangaIdAndUrlExcludingId,
      ).not.toHaveBeenCalled();
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {});
    });
  });
});
