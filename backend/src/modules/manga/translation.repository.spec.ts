import { Repository } from 'typeorm';
import { TranslationRepository } from './translation.repository';
import { Translation } from 'src/modules/manga/entities/translation.entity';

describe('TranslationRepository', () => {
  let repo: TranslationRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    repo = new TranslationRepository(
      mockRepo as unknown as Repository<Translation>,
    );
    jest.clearAllMocks();
  });

  describe('findByChapterAndLanguageAndTranslator', () => {
    it('should find translation by chapter, language, and translator IDs', async () => {
      const expected = { id: 1, chapter: { id: 1 } } as Translation;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findByChapterAndLanguageAndTranslator(1, 2, 3);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: {
          chapter: { id: 1 },
          language: { id: 2 },
          translator: { id: 3 },
        },
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByChapterAndLanguageAndTranslator(
        999,
        999,
        999,
      );
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should save and return a new translation', async () => {
      const data = { folderPath: '/chapters/1' } as Partial<Translation>;
      const saved = { id: 1, ...data } as Translation;
      mockRepo.save.mockResolvedValue(saved);
      const result = await repo.create(data);
      expect(mockRepo.save).toHaveBeenCalledWith(data);
      expect(result).toEqual(saved);
    });
  });

  describe('findById', () => {
    it('should find translation by id with relations', async () => {
      const expected = {
        id: 1,
        chapter: { id: 1, manga: { id: 1 } },
      } as unknown as Translation;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findById(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['chapter', 'chapter.manga'],
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return the translation', async () => {
      const id = 1;
      const data = { folderPath: '/new/path' };
      const updated = { id, folderPath: '/new/path', chapter: { id: 1 } } as Translation;
      (mockRepo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(updated);
      const result = await repo.update(id, data);
      expect(mockRepo.update).toHaveBeenCalledWith(id, data);
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should delete translation by id', async () => {
      (mockRepo.delete as jest.Mock).mockResolvedValue({ affected: 1 });
      await repo.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
