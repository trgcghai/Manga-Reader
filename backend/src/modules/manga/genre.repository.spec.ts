import { Repository } from 'typeorm';
import { GenreRepository } from './genre.repository';
import { Genre } from 'src/modules/manga/entities/genre.entity';

describe('GenreRepository', () => {
  let repo: GenreRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(() => {
    repo = new GenreRepository(mockRepo as unknown as Repository<Genre>);
    jest.clearAllMocks();
  });

  describe('findOneByName', () => {
    it('should find genre by exact name match', async () => {
      const genre = { id: 1, name: 'Fantasy' } as Genre;
      mockRepo.findOne.mockResolvedValue(genre);

      const result = await repo.findOneByName('Fantasy');

      expect(result).toEqual(genre);
    });

    it('should NOT find genre when case differs (case-sensitive)', async () => {
      mockRepo.findOne.mockImplementation(({ where: { name } }) => {
        return name === 'Fantasy'
          ? ({ id: 1, name: 'Fantasy' } as Genre)
          : null;
      });

      const result = await repo.findOneByName('fantasy');

      expect(result).toBeNull();
    });

    it('should trim whitespace from name before querying', async () => {
      const genre = { id: 1, name: 'Fantasy' } as Genre;
      mockRepo.findOne.mockResolvedValue(genre);

      await repo.findOneByName('  Fantasy  ');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Fantasy' },
      });
    });

    it('should return null when no matching genre exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneByName('Nonexistent');

      expect(result).toBeNull();
    });

    it('should call repo.findOne with exact name (no toLowerCase)', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await repo.findOneByName('UpperCase Name');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'UpperCase Name' },
      });
    });

    it('should propagate database errors', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB connection lost'));

      await expect(repo.findOneByName('Test')).rejects.toThrow(
        'DB connection lost',
      );
    });
  });

  describe('create', () => {
    it('should save and return new genre', async () => {
      const genreData = { name: 'New Genre' };
      const saved = { id: 1, name: 'New Genre' } as Genre;
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.create(genreData);

      expect(mockRepo.save).toHaveBeenCalledWith(genreData);
      expect(result).toEqual(saved);
    });

    it('should propagate save errors', async () => {
      mockRepo.save.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(repo.create({ name: 'Duplicate' })).rejects.toThrow(
        'Unique constraint violation',
      );
    });
  });
});
