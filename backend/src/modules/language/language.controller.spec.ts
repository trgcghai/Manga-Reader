import { Test, TestingModule } from '@nestjs/testing';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';
import { Language } from 'src/modules/language/entities/language.entity';

describe('LanguageController', () => {
  let controller: LanguageController;
  let service: jest.Mocked<LanguageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguageController],
      providers: [
        {
          provide: LanguageService,
          useValue: {
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LanguageController>(LanguageController);
    service = module.get(LanguageService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all languages', async () => {
      const languages = [
        { id: 1, code: 'en', name: 'English' },
        { id: 2, code: 'ja', name: 'Japanese' },
      ] as Language[];
      service.findAll.mockResolvedValue(languages);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(languages);
    });
  });
});
