/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unnecessary-type-assertion */
import { Test, TestingModule } from '@nestjs/testing';
import { TrackingService } from './tracking.service';
import { TrackingRepository } from './tracking.repository';
import { MangaRepository } from '../manga/repositories/manga.repository';
import {
  NotFoundException,
  ConflictException,
  BadGatewayException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TrackingFrequency } from 'src/common/constants/tracking.constant';

describe('TrackingService', () => {
  let service: TrackingService;
  let trackingRepo: jest.Mocked<TrackingRepository>;
  let mangaRepo: jest.Mocked<MangaRepository>;
  let httpService: { axiosRef: { get: jest.Mock } };

  const mockManga = { id: 1, title: 'One Piece' } as any;

  beforeEach(async () => {
    httpService = { axiosRef: { get: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        {
          provide: TrackingRepository,
          useValue: {
            findAllSources: jest.fn(),
            findAllSourcesPaginated: jest.fn(),
            findAllSourcesForCheck: jest.fn(),
            findByMangaIdForCheck: jest.fn(),
            createSource: jest.fn(),
            findSourceById: jest.fn(),
            findByMangaIdAndNameExcludingId: jest.fn(),
            findByMangaIdAndUrlExcludingId: jest.fn(),
            updateSource: jest.fn(),
            deleteSource: jest.fn(),
            findConfig: jest.fn(),
            upsertConfig: jest.fn(),
          },
        },
        {
          provide: MangaRepository,
          useValue: {
            findOneById: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
    trackingRepo = module.get(TrackingRepository);
    mangaRepo = module.get(MangaRepository);
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
      } as any);

      const result = await service.createSource(dto);

      expect(result.mangaId).toBe(1);
      expect(result.name).toBe('MangaDex');
      expect(result.latestChapterNumber).toBeNull();
      expect(mangaRepo.findOneById).toHaveBeenCalledWith(1);
      expect(trackingRepo.createSource).toHaveBeenCalled();
    });

    it('should not forward extractorPath when omitted', async () => {
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
      } as any);

      await service.createSource(dto);

      expect(trackingRepo.createSource).not.toHaveBeenCalledWith(
        expect.objectContaining({
          extractorPath: expect.anything(),
        }),
      );
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

    it('should persist extractorPath when provided', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([]);
      trackingRepo.createSource.mockResolvedValue({
        id: 1,
        manga: mockManga,
        url: dto.url,
        name: dto.name,
        extractorPath: 'data.chapters[0].number',
        latestChapterNumber: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createSource({
        ...dto,
        extractorPath: 'data.chapters[0].number',
      });

      expect(trackingRepo.createSource).toHaveBeenCalledWith(
        expect.objectContaining({
          manga: mockManga,
          url: dto.url,
          name: dto.name,
          extractorPath: 'data.chapters[0].number',
        }),
      );
      expect(result.extractorPath).toBe('data.chapters[0].number');
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
        undefined,
      );
    });

    it('should map each source to a response DTO including mangaId', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [mockSource] as any,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      const result = await service.findAllSources();

      expect(result.data[0]).toEqual({
        id: 1,
        mangaId: 1,
        url: 'https://example.com/manga/one-piece',
        name: 'MangaDex',
        latestChapterNumber: null,
        extractorPath: null,
        createdAt: mockSource.createdAt.toISOString(),
        updatedAt: mockSource.updatedAt.toISOString(),
        manga: { id: 1, title: 'One Piece' },
      });
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
        undefined,
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
        undefined,
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

    it('should forward search term to repository', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await service.findAllSources(undefined, 1, 20, 'naruto');

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        'naruto',
      );
    });

    it('should trim the search term before forwarding', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await service.findAllSources(undefined, 1, 20, '  naruto  ');

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        'naruto',
      );
    });

    it('should forward undefined when search is blank', async () => {
      trackingRepo.findAllSourcesPaginated.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });

      await service.findAllSources(undefined, 1, 20, '   ');

      expect(trackingRepo.findAllSourcesPaginated).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        undefined,
      );
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

    it('should update extractorPath and include it in the response DTO', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.updateSource.mockResolvedValue({
        ...existingSource,
        extractorPath: 'latest.number',
      } as any);

      const result = await service.updateSource(1, {
        extractorPath: 'latest.number',
      });

      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        extractorPath: 'latest.number',
      });
      expect(result.extractorPath).toBe('latest.number');
    });
  });

  describe('deleteSource', () => {
    const existingSource = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should delete a source successfully', async () => {
      trackingRepo.findSourceById.mockResolvedValue(existingSource as any);
      trackingRepo.deleteSource.mockResolvedValue(true);

      await service.deleteSource(1);

      expect(trackingRepo.findSourceById).toHaveBeenCalledWith(1);
      expect(trackingRepo.deleteSource).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when source does not exist', async () => {
      trackingRepo.findSourceById.mockResolvedValue(null);

      await expect(service.deleteSource(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(trackingRepo.deleteSource).not.toHaveBeenCalled();
    });
  });

  describe('checkSource', () => {
    const source = {
      id: 1,
      manga: { id: 1, title: 'One Piece' },
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
      latestChapterNumber: '100',
      extractorPath: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return updated true and persist when a newer chapter is found', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '101' },
      });
      trackingRepo.updateSource.mockResolvedValue({
        ...source,
        latestChapterNumber: '101',
      } as any);

      const result = await service.checkSource(1);

      expect(result).toEqual({
        updated: true,
        previous: '100',
        current: '101',
        mangaId: 1,
      });
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        latestChapterNumber: '101',
      });
    });

    it('should compare decimals numerically (1120.5 > 1120)', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        latestChapterNumber: '1120',
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: 1120.5 },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({
        updated: true,
        previous: '1120',
        current: '1120.5',
        mangaId: 1,
      });
      expect(trackingRepo.updateSource).toHaveBeenCalledWith(1, {
        latestChapterNumber: '1120.5',
      });
    });

    it('should use extractorPath to navigate nested JSON', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        extractorPath: 'data.chapters[0].number',
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { data: { chapters: [{ number: '1140' }] } },
      });
      trackingRepo.updateSource.mockResolvedValue({} as any);

      const result = await service.checkSource(1);

      expect(result).toEqual({
        updated: true,
        previous: '100',
        current: '1140',
        mangaId: 1,
      });
    });

    it('should not update when the chapter is the same', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '100' },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({ updated: false, current: '100' });
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should not update when the chapter is older', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        latestChapterNumber: '200',
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '150' },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({ updated: false, current: '150' });
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should not update when previous chapter number is null', async () => {
      trackingRepo.findSourceById.mockResolvedValue({
        ...source,
        latestChapterNumber: null,
      } as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { chapterNumber: '50' },
      });

      const result = await service.checkSource(1);

      expect(result).toEqual({ updated: false, current: '50' });
      expect(trackingRepo.updateSource).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the source does not exist', async () => {
      trackingRepo.findSourceById.mockResolvedValue(null);

      await expect(service.checkSource(999)).rejects.toThrow(NotFoundException);
      expect(httpService.axiosRef.get).not.toHaveBeenCalled();
    });

    it('should throw BadGatewayException when the URL is unreachable', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockRejectedValue(
        new Error('ECONNREFUSED'),
      );

      await expect(service.checkSource(1)).rejects.toThrow(BadGatewayException);
    });

    it('should throw UnprocessableEntityException when the body is not valid JSON', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: '<html>not json</html>',
      });

      await expect(service.checkSource(1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should throw UnprocessableEntityException when the chapter number is not extractable', async () => {
      trackingRepo.findSourceById.mockResolvedValue(source as any);
      (httpService.axiosRef.get as jest.Mock).mockResolvedValue({
        data: { foo: 'bar' },
      });

      await expect(service.checkSource(1)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });
  });

  describe('getConfig', () => {
    const existingConfig = {
      id: 1,
      frequency: TrackingFrequency.DAILY,
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('should return existing config mapped to DTO', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig);

      const result = await service.getConfig();

      expect(result).toEqual({
        id: 1,
        frequency: TrackingFrequency.DAILY,
        interval: 1,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(trackingRepo.findConfig).toHaveBeenCalled();
      expect(trackingRepo.upsertConfig).not.toHaveBeenCalled();
    });

    it('should auto-create default config when none exists', async () => {
      trackingRepo.findConfig.mockResolvedValue(null);
      trackingRepo.upsertConfig.mockResolvedValue(existingConfig);

      const result = await service.getConfig();

      expect(result.frequency).toBe(TrackingFrequency.DAILY);
      expect(result.interval).toBe(1);
      expect(result.runAt).toBe('00:00');
      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: TrackingFrequency.DAILY,
        interval: 1,
        runAt: '00:00',
      });
    });
  });

  describe('updateConfig', () => {
    const existingConfig = {
      id: 1,
      frequency: TrackingFrequency.DAILY,
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    it('should preserve unspecified fields on partial update', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig);
      trackingRepo.upsertConfig.mockResolvedValue({
        ...existingConfig,
        frequency: TrackingFrequency.WEEKLY,
      });

      const result = await service.updateConfig({
        frequency: TrackingFrequency.WEEKLY,
      });

      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: TrackingFrequency.WEEKLY,
        interval: 1,
        runAt: '00:00',
      });
      expect(result).toEqual({
        id: 1,
        frequency: TrackingFrequency.WEEKLY,
        interval: 1,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should auto-create merging over defaults when none exists', async () => {
      trackingRepo.findConfig.mockResolvedValue(null);
      trackingRepo.upsertConfig.mockResolvedValue({
        ...existingConfig,
        runAt: '23:59',
      });

      const result = await service.updateConfig({ runAt: '23:59' });

      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: TrackingFrequency.DAILY,
        interval: 1,
        runAt: '23:59',
      });
      expect(result.runAt).toBe('23:59');
    });

    it('should map result to DTO with ISO updatedAt', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig);
      trackingRepo.upsertConfig.mockResolvedValue({
        ...existingConfig,
        interval: 2,
      });

      const result = await service.updateConfig({ interval: 2 });

      expect(result).toEqual({
        id: 1,
        frequency: TrackingFrequency.DAILY,
        interval: 2,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
      expect(trackingRepo.findConfig).toHaveBeenCalled();
    });

    it('should be a no-op on empty body', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig);
      trackingRepo.upsertConfig.mockResolvedValue({ ...existingConfig });

      const result = await service.updateConfig({});

      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: TrackingFrequency.DAILY,
        interval: 1,
        runAt: '00:00',
      });
      expect(result).toEqual({
        id: 1,
        frequency: TrackingFrequency.DAILY,
        interval: 1,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('should treat undefined dto keys as absent', async () => {
      trackingRepo.findConfig.mockResolvedValue(existingConfig);
      trackingRepo.upsertConfig.mockResolvedValue({
        ...existingConfig,
        frequency: TrackingFrequency.WEEKLY,
      });

      const result = await service.updateConfig({
        frequency: TrackingFrequency.WEEKLY,
        interval: undefined,
        runAt: undefined,
      });

      expect(trackingRepo.upsertConfig).toHaveBeenCalledWith({
        frequency: TrackingFrequency.WEEKLY,
        interval: 1,
        runAt: '00:00',
      });
      expect(result).toEqual({
        id: 1,
        frequency: TrackingFrequency.WEEKLY,
        interval: 1,
        runAt: '00:00',
        updatedAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });
});
