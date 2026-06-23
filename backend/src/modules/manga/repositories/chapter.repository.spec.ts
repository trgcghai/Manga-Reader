import { LessThan, MoreThan, Repository } from 'typeorm';
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
        relations: [
          'translations',
          'translations.language',
          'translations.translator',
        ],
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

  describe('findAdjacent', () => {
    const mockChapter = { id: 2, number: 2, title: 'Ch 2' } as Chapter;

    it('should find previous chapter using LessThan and DESC order', async () => {
      mockRepo.findOne.mockResolvedValue(mockChapter);
      const result = await repo.findAdjacent(10, 3, 'prev');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { manga: { id: 10 }, number: LessThan(3) },
        order: { number: 'DESC' },
        relations: [
          'translations',
          'translations.language',
          'translations.translator',
        ],
      });
      expect(result).toEqual(mockChapter);
    });

    it('should find next chapter using MoreThan and ASC order', async () => {
      const nextChapter = { id: 4, number: 4, title: 'Ch 4' } as Chapter;
      mockRepo.findOne.mockResolvedValue(nextChapter);
      const result = await repo.findAdjacent(10, 3, 'next');
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { manga: { id: 10 }, number: MoreThan(3) },
        order: { number: 'ASC' },
        relations: [
          'translations',
          'translations.language',
          'translations.translator',
        ],
      });
      expect(result).toEqual(nextChapter);
    });

    it('should return null when no adjacent chapter exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findAdjacent(10, 99, 'next');
      expect(result).toBeNull();
    });
  });
});
