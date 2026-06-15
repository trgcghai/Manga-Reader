import { Repository } from 'typeorm';
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
    repo = new MangaRepository(mockRepo as unknown as Repository<Manga>);
    jest.clearAllMocks();
  });

  describe('findOneByIdWithRelations', () => {
    it('should find manga with authors and genres relations', async () => {
      const expected = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      mockRepo.findOne.mockResolvedValue(expected);
      const result = await repo.findOneByIdWithRelations(1);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['authors', 'genres'],
      });
      expect(result).toEqual(expected);
    });

    it('should load chapters and translations when includeDetail is true', async () => {
      const mockManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
        chapters: [
          {
            id: 1,
            number: 1,
            translations: [
              {
                id: 1,
                folderPath: '/path',
                language: { id: 1, code: 'en', name: 'English' },
                translator: { id: 1, name: 'T1' },
              },
            ],
          },
        ],
      } as unknown as Manga;
      mockRepo.findOne.mockResolvedValue(mockManga);
      const result = await repo.findOneByIdWithRelations(1, true);
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['authors', 'genres', 'chapters', 'chapters.translations'],
      });
      expect(result).toEqual(mockManga);
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
      const existing = {
        id: 1,
        title: 'Original',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const saved = {
        id: 1,
        title: 'Updated',
        authors: [],
        genres: [],
      } as unknown as Manga;
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
      const existing = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const partial = { authors: [author], genres: [genre] } as Partial<Manga>;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await repo.update(1, partial);

      expect(existing.authors).toEqual([author]);
      expect(existing.genres).toEqual([genre]);
    });

    it('should mutate all scalar fields from partial data', async () => {
      const existing = {
        id: 1,
        title: 'Old',
        status: 'ongoing',
        description: 'Old desc',
        alternativeTitles: ['Old'],
        coverPath: '/old.jpg',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const partial = {
        title: 'New',
        status: 'completed',
        description: 'New desc',
        alternativeTitles: ['New'],
        coverPath: '/new.jpg',
      } as Partial<Manga>;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await repo.update(1, partial);

      expect(existing.title).toBe('New');
      expect(existing.status).toBe('completed');
      expect(existing.description).toBe('New desc');
      expect(existing.alternativeTitles).toEqual(['New']);
      expect(existing.coverPath).toBe('/new.jpg');
    });

    it('should NOT overwrite fields not present in partial data', async () => {
      const existing = {
        id: 1,
        title: 'Original',
        status: 'ongoing',
        description: 'Some desc',
        alternativeTitles: ['Alt'],
        coverPath: '/path.jpg',
        authors: [],
        genres: [],
      } as unknown as Manga;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await repo.update(1, { title: 'Only Title Changed' });

      expect(existing.title).toBe('Only Title Changed');
      expect(existing.status).toBe('ongoing');
      expect(existing.description).toBe('Some desc');
      expect(existing.alternativeTitles).toEqual(['Alt']);
      expect(existing.coverPath).toBe('/path.jpg');
    });

    it('should use findOne with relations (NOT preload)', async () => {
      const existing = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await repo.update(1, { title: 'Updated' });

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['authors', 'genres'],
      });
      expect(mockRepo.preload).not.toHaveBeenCalled();
    });

    it('should propagate errors from findOne', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB error'));

      await expect(repo.update(1, { title: 'Nope' })).rejects.toThrow(
        'DB error',
      );
    });

    it('should propagate errors from save', async () => {
      const existing = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockRejectedValue(new Error('Save failed'));

      await expect(repo.update(1, { title: 'Nope' })).rejects.toThrow(
        'Save failed',
      );
    });

    it('should save the same mutated entity reference', async () => {
      const existing = {
        id: 1,
        title: 'Original',
        authors: [],
        genres: [],
      } as unknown as Manga;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(existing);

      await repo.update(1, { title: 'Mutated' });

      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(existing.title).toBe('Mutated');
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
