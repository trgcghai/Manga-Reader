import { Test, TestingModule } from '@nestjs/testing';
import { LanguageService } from './language.service';
import { LanguageRepository } from './language.repository';
import { Language } from 'src/modules/language/entities/language.entity';

describe('LanguageService', () => {
  let service: LanguageService;
  const mockRepo = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        { provide: LanguageRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(LanguageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all languages', async () => {
      const languages = [{ id: 1, code: 'en', name: 'English' }] as Language[];
      mockRepo.findAll.mockResolvedValue(languages);

      const result = await service.findAll();

      expect(mockRepo.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(languages);
    });
  });
});
