import { MangaRepository } from './manga.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';

describe('MangaRepository', () => {
  let repo: MangaRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    preload: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    repo = new MangaRepository(mockRepo as any);
    jest.clearAllMocks();
  });

  describe('findOneByIdWithRelations', () => {
    it('should find manga with authors and genres relations', async () => {
      const expected = { id: 1, title: 'Test', authors: [], genres: [] } as Manga;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findOneByIdWithRelations(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['authors', 'genres'],
      });
      expect(result).toEqual(expected);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.findOneByIdWithRelations(999);
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should preload and save manga', async () => {
      const partial = { title: 'Updated' };
      const preloaded = { id: 1, title: 'Original' } as Manga;
      const saved = { id: 1, title: 'Updated' } as Manga;
      mockRepo.preload.mockResolvedValue(preloaded);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, partial);

      expect(mockRepo.preload).toHaveBeenCalledWith({ id: 1, ...partial });
      expect(mockRepo.save).toHaveBeenCalledWith(preloaded);
      expect(result).toEqual(saved);
    });

    it('should return null when preload returns null', async () => {
      mockRepo.preload.mockResolvedValue(null);
      const result = await repo.update(999, { title: 'Nope' });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete and return true when affected > 0', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1, raw: {} });
      const result = await repo.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when nothing deleted', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0, raw: {} });
      const result = await repo.delete(999);
      expect(result).toBe(false);
    });
  });
});
