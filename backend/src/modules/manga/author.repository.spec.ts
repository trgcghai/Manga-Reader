import { Repository } from 'typeorm';
import { AuthorRepository } from './author.repository';
import { Author } from 'src/modules/manga/entities/author.entity';

describe('AuthorRepository', () => {
  let repo: AuthorRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    repo = new AuthorRepository(mockRepo as unknown as Repository<Author>);
    jest.clearAllMocks();
  });

  describe('findOneByName', () => {
    it('should find author by exact name match', async () => {
      const author = { id: 1, name: 'Kentaro Miura' } as Author;
      mockRepo.findOne.mockResolvedValue(author);

      const result = await repo.findOneByName('Kentaro Miura');

      expect(result).toEqual(author);
    });

    it('should NOT find author when case differs (case-sensitive)', async () => {
      mockRepo.findOne.mockImplementation(({ where: { name } }) => {
        return name === 'Kentaro Miura'
          ? ({ id: 1, name: 'Kentaro Miura' } as Author)
          : null;
      });

      const result = await repo.findOneByName('kentaro miura');

      expect(result).toBeNull();
    });

    it('should trim whitespace from name before querying', async () => {
      const author = { id: 1, name: 'Kentaro Miura' } as Author;
      mockRepo.findOne.mockResolvedValue(author);

      await repo.findOneByName('  Kentaro Miura  ');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Kentaro Miura' },
      });
    });

    it('should return null when no matching author exists', async () => {
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
    it('should return paginated authors without search', async () => {
      const authors = [
        { id: 1, name: 'Author A' },
        { id: 2, name: 'Author B' },
      ] as Author[];
      const count = 2;

      const mockQb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([authors, count]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await repo.findAll();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('author');
      expect(mockQb.loadRelationCountAndMap).toHaveBeenCalledWith(
        'author.mangaCount',
        'author.mangas',
      );
      expect(mockQb.orderBy).toHaveBeenCalledWith('author.name', 'ASC');
      expect(result).toEqual({
        data: authors,
        total: count,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply ILIKE search filter when search param provided', async () => {
      const authors = [{ id: 1, name: 'Kentaro Miura' }] as Author[];
      const mockQb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([authors, 1]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      await repo.findAll('miura');

      expect(mockQb.where).toHaveBeenCalledWith(
        'author.name ILIKE :search',
        { search: '%miura%' },
      );
    });

    it('should calculate correct totalPages', async () => {
      const authors = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Author ${i + 1}`,
      })) as Author[];
      const mockQb = {
        loadRelationCountAndMap: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([authors, 25]),
      };
      mockRepo.createQueryBuilder = jest.fn().mockReturnValue(mockQb);

      const result = await repo.findAll(undefined, 1, 10);

      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOneById', () => {
    it('should find author by id', async () => {
      const author = { id: 1, name: 'Kentaro Miura' } as Author;
      mockRepo.findOne.mockResolvedValue(author);

      const result = await repo.findOneById(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(author);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update author name', async () => {
      const existing = { id: 1, name: 'Old Name' } as Author;
      const saved = { id: 1, name: 'New Name' } as Author;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, { name: 'New Name' });

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(existing.name).toBe('New Name');
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(saved);
    });

    it('should return null when author not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.update(999, { name: 'Nope' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when deleted', async () => {
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

  describe('create', () => {
    it('should save and return new author', async () => {
      const authorData = { name: 'New Author' };
      const saved = { id: 1, name: 'New Author' } as Author;
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.create(authorData);

      expect(mockRepo.save).toHaveBeenCalledWith(authorData);
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
