import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import {
  CreateTrackingSourceDto,
  UpdateTrackingSourceDto,
  TrackingSourceResponseDto,
} from './dto/tracking-source.dto';
import {
  UpdateTrackingConfigDto,
  TrackingConfigResponseDto,
} from './dto/tracking-config.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TrackingFrequency } from 'src/common/constants/tracking.constant';

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
    manga: { id: 1, title: 'One Piece' },
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
            deleteSource: jest.fn(),
            getConfig: jest.fn(),
            updateConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    service = module.get(TrackingService);
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
      expect(service.findAllSources).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        undefined,
      );
    });

    it('should pass mangaId filter', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      await controller.findAll('1');

      expect(service.findAllSources).toHaveBeenCalledWith(1, 1, 20, undefined);
    });

    it('should pass page and limit params', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      await controller.findAll(undefined, '2', '5');

      expect(service.findAllSources).toHaveBeenCalledWith(
        undefined,
        2,
        5,
        undefined,
      );
    });

    it('should pass search param', async () => {
      service.findAllSources.mockResolvedValue(paginatedResult);

      await controller.findAll(undefined, '1', '20', 'naruto');

      expect(service.findAllSources).toHaveBeenCalledWith(
        undefined,
        1,
        20,
        'naruto',
      );
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

  describe('getConfig', () => {
    const mockConfig: TrackingConfigResponseDto = {
      id: 1,
      frequency: TrackingFrequency.DAILY,
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date().toISOString(),
    };

    it('should return tracking config DTO', async () => {
      service.getConfig.mockResolvedValue(mockConfig);

      const result = await controller.getConfig();

      expect(result).toEqual(mockConfig);
      expect(service.getConfig).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    const updateDto: UpdateTrackingConfigDto = {
      frequency: TrackingFrequency.WEEKLY,
    };

    const mockConfig: TrackingConfigResponseDto = {
      id: 1,
      frequency: TrackingFrequency.WEEKLY,
      interval: 1,
      runAt: '00:00',
      updatedAt: new Date().toISOString(),
    };

    it('should call service.updateConfig with dto and return result', async () => {
      service.updateConfig.mockResolvedValue(mockConfig);

      const result = await controller.updateConfig(updateDto);

      expect(result).toEqual(mockConfig);
      expect(service.updateConfig).toHaveBeenCalledWith(updateDto);
    });

    it('should propagate service rejection', async () => {
      service.updateConfig.mockRejectedValue(new Error('boom'));

      await expect(controller.updateConfig(updateDto)).rejects.toThrow('boom');
    });
  });

  describe('delete', () => {
    it('should delete a source and return no body', async () => {
      service.deleteSource.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(result).toBeUndefined();
      expect(service.deleteSource).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when source not found', async () => {
      service.deleteSource.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
