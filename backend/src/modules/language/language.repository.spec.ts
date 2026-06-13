import { Repository } from 'typeorm';
import { LanguageRepository } from './language.repository';
import { Language } from 'src/modules/language/entities/language.entity';

describe('LanguageRepository', () => {
  let repo: LanguageRepository;
  const mockRepo = {
    find: jest.fn(),
  };

  beforeEach(() => {
    repo = new LanguageRepository(mockRepo as unknown as Repository<Language>);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all languages', async () => {
      const languages = [
        { id: 1, code: 'en', name: 'English' },
        { id: 2, code: 'ja', name: 'Japanese' },
      ] as Language[];
      mockRepo.find.mockResolvedValue(languages);

      const result = await repo.findAll();

      expect(mockRepo.find).toHaveBeenCalledWith();
      expect(result).toEqual(languages);
    });
  });
});
