import { Repository } from 'typeorm';
import { ChapterRepository } from './chapter.repository';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';

describe('ChapterRepository', () => {
  let repo: ChapterRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    repo = new ChapterRepository(mockRepo as unknown as Repository<Chapter>);
    jest.clearAllMocks();
  });

  describe('findByMangaAndNumber', () => {
    it('should find chapter by manga ID and number', async () => {
      const expected = { id: 1, number: 5, title: 'Ch 5' } as Chapter;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findByMangaAndNumber(1, 5);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { manga: { id: 1 }, number: 5 },
        relations: ['translations', 'translations.language', 'translations.translator'],
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByMangaAndNumber(999, 99);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should save and return a new chapter', async () => {
      const data = { number: 1, title: 'New Chapter' } as Partial<Chapter>;
      const saved = { id: 1, ...data } as Chapter;
      mockRepo.save.mockResolvedValue(saved);
      const result = await repo.create(data);
      expect(mockRepo.save).toHaveBeenCalledWith(data);
      expect(result).toEqual(saved);
    });
  });
});
