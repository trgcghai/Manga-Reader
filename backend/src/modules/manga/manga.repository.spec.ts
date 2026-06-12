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
    it('should find, mutate, and save manga', async () => {
      const partial = { title: 'Updated' };
      const existing = { id: 1, title: 'Original', authors: [], genres: [] } as Manga;
      const saved = { id: 1, title: 'Updated', authors: [], genres: [] } as Manga;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, partial);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['authors', 'genres'],
      });
      expect(existing.title).toBe('Updated');
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(saved);
    });

    it('should return null when manga not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await repo.update(999, { title: 'Nope' });
      expect(result).toBeNull();
    });

    it('should update authors and genres when provided', async () => {
      const author = { id: 1, name: 'Author' };
      const genre = { id: 1, name: 'Genre' };
      const existing = { id: 1, title: 'Test', authors: [], genres: [] } as Manga;
      const partial = { authors: [author], genres: [genre] } as any;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await repo.update(1, partial);

      expect(existing.authors).toEqual([author]);
      expect(existing.genres).toEqual([genre]);
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
