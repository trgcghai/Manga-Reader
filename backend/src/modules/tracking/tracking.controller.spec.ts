import { Test, TestingModule } from '@nestjs/testing';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { CreateTrackingSourceDto, TrackingSourceResponseDto } from './dto/tracking-source.dto';
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
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
    service = module.get(TrackingService) as jest.Mocked<TrackingService>;
  });

  describe('getStatus', () => {
    it('should return module status', () => {
      const expected = { status: 'ok', module: 'tracking', timestamp: '2026-01-01T00:00:00.000Z' };
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
});
