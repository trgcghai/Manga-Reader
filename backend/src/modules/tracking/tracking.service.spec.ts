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
            createSource: jest.fn(),
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
    trackingRepo = module.get(TrackingRepository) as jest.Mocked<TrackingRepository>;
    mangaRepo = module.get(MangaRepository) as jest.Mocked<MangaRepository>;
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
    const dto = { mangaId: 1, url: 'https://example.com/manga/one-piece', name: 'MangaDex' };

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

    it('should throw NotFoundException when manga does not exist', async () => {
      mangaRepo.findOneById.mockResolvedValue(null);

      await expect(service.createSource(dto)).rejects.toThrow(NotFoundException);
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, name) is duplicate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([
        { manga: { id: 1 }, name: 'MangaDex', url: 'https://other.com' } as any,
      ]);

      await expect(service.createSource(dto)).rejects.toThrow(ConflictException);
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when (mangaId, url) is duplicate', async () => {
      mangaRepo.findOneById.mockResolvedValue(mockManga);
      trackingRepo.findAllSources.mockResolvedValue([
        { manga: { id: 1 }, name: 'Other', url: 'https://example.com/manga/one-piece' } as any,
      ]);

      await expect(service.createSource(dto)).rejects.toThrow(ConflictException);
      expect(trackingRepo.createSource).not.toHaveBeenCalled();
    });
  });
});
