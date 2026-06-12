/* eslint-disable @typescript-eslint/unbound-method */
import { Repository } from 'typeorm';
import { GenreRepository } from './genre.repository';
import { Genre } from 'src/modules/manga/entities/genre.entity';

describe('GenreRepository', () => {
  let repo: GenreRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    manager: {
      query: jest.fn().mockResolvedValue(undefined),
    },
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

  describe('findAll', () => {
    it('should return paginated genres without search', async () => {
      const genres = [
        { id: 1, name: 'Action' },
        { id: 2, name: 'Fantasy' },
      ] as Genre[];
      const count = 2;

      const mockQb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([genres, count]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await repo.findAll();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('genre');
      expect(mockQb.loadRelationCountAndMap).toHaveBeenCalledWith(
        'genre.mangaCount',
        'genre.mangas',
      );
      expect(mockQb.orderBy).toHaveBeenCalledWith('genre.name', 'ASC');
      expect(result).toEqual({
        data: genres,
        total: count,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply ILIKE search filter when search param provided', async () => {
      const genres = [{ id: 1, name: 'Fantasy' }] as Genre[];
      const mockQb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([genres, 1]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      await repo.findAll('fant');

      expect(mockQb.where).toHaveBeenCalledWith('genre.name ILIKE :search', {
        search: '%fant%',
      });
    });

    it('should calculate correct totalPages', async () => {
      const genres = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Genre ${i + 1}`,
      })) as Genre[];
      const mockQb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([genres, 25]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await repo.findAll(undefined, 1, 10);

      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOneById', () => {
    it('should find genre by id', async () => {
      const genre = { id: 1, name: 'Fantasy' } as Genre;
      mockRepo.findOne.mockResolvedValue(genre);

      const result = await repo.findOneById(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(genre);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update genre name', async () => {
      const existing = { id: 1, name: 'Old Name' } as Genre;
      const saved = { id: 1, name: 'New Name' } as Genre;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, { name: 'New Name' });

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(existing.name).toBe('New Name');
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(saved);
    });

    it('should return null when genre not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.update(999, { name: 'Nope' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1, raw: {} });

      const result = await repo.delete(1);

      expect(mockRepo.manager.query).toHaveBeenCalledWith(
        'DELETE FROM "manga_genres" WHERE "genre_id" = $1',
        [1],
      );
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });

    it('should return false when nothing deleted', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0, raw: {} });

      const result = await repo.delete(999);

      expect(mockRepo.manager.query).toHaveBeenCalledWith(
        'DELETE FROM "manga_genres" WHERE "genre_id" = $1',
        [999],
      );
      expect(result).toBe(false);
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
