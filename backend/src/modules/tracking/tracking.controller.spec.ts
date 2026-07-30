import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TrackingController', () => {
  let controller: TrackingController;
  let service: jest.Mocked<TrackingService>;

  const mockResponse: TrackingSourceResponseDto = {
    id: 1,
    mangaId: 1,
    url: 'https://example.com/manga/one-piece',
    name: 'MangaDex',
    latestChapterNumber: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        {
          provide: TrackingService,
          useValue: {
            getStatus: jest.fn(),
            createSource: jest.fn(),
            findAllSources: jest.fn(),
            updateSource: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    service = module.get(TrackingService);
  });

  describe('getStatus', () => {
    it('should return module status', () => {
      const expected = {
        status: 'ok',
        module: 'tracking',
        timestamp: '2026-01-01T00:00:00.000Z',
      };
      service.getStatus.mockReturnValue(expected);

      const result = controller.getStatus();

      expect(result).toEqual(expected);
      expect(service.getStatus).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const dto: CreateTrackingSourceDto = {
      mangaId: 1,
      url: 'https://example.com/manga/one-piece',
      name: 'MangaDex',
    };

    it('should create a tracking source and return 201', async () => {
      service.createSource.mockResolvedValue(mockResponse);

      const result = await controller.create(dto);

      expect(result).toEqual(mockResponse);
      expect(service.createSource).toHaveBeenCalledWith(dto);
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      service.createSource.mockRejectedValue(new NotFoundException());

      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException on duplicate name', async () => {
      service.createSource.mockRejectedValue(new ConflictException('name'));

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException on duplicate url', async () => {
      service.createSource.mockRejectedValue(new ConflictException('url'));

      await expect(controller.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const paginatedResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    };

    it('should return paginated sources', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      const result = await controller.findAll();

      expect(result).toEqual(paginatedResult);
      expect(service.findAllSources).toHaveBeenCalledWith(undefined, 1, 20);
    });

    it('should pass mangaId filter', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      await controller.findAll('1');

      expect(service.findAllSources).toHaveBeenCalledWith(1, 1, 20);
    });

    it('should pass page and limit params', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      await controller.findAll(undefined, '2', '5');

      expect(service.findAllSources).toHaveBeenCalledWith(undefined, 2, 5);
    });
  });

  describe('update', () => {
    const updateDto: UpdateTrackingSourceDto = { name: 'MangaPlus' };

    it('should update and return updated source', async () => {
      service.updateSource.mockResolvedValue(mockResponse);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(mockResponse);
      expect(service.updateSource).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when source not found', async () => {
      service.updateSource.mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on duplicate name', async () => {
      service.updateSource.mockRejectedValue(new ConflictException('name'));

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
