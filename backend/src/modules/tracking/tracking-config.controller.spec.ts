import { Test, TestingModule } from '@nestjs/testing';
import { TrackingConfigController } from './tracking-config.controller';
import { TrackingService } from './tracking.service';
import { TrackingConfigResponseDto } from './dto/tracking-config.dto';

describe('TrackingConfigController', () => {
  let controller: TrackingConfigController;
  let service: jest.Mocked<TrackingService>;

  const mockResponse: TrackingConfigResponseDto = {
    id: 1,
    frequency: 'daily',
    interval: 1,
    runAt: '00:00',
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingConfigController],
      providers: [
        {
          provide: TrackingService,
          useValue: {
            getConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TrackingConfigController>(TrackingConfigController);
    service = module.get(TrackingService);
  });

  describe('getConfig', () => {
    it('should return tracking config DTO', async () => {
      service.getConfig.mockResolvedValue(mockResponse);

      const result = await controller.getConfig();

      expect(result).toEqual(mockResponse);
      expect(service.getConfig).toHaveBeenCalled();
    });
  });
});
