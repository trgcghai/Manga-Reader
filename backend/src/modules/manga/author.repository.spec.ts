import { Repository } from 'typeorm';
import { AuthorRepository } from './author.repository';
import { Author } from 'src/modules/manga/entities/author.entity';

describe('AuthorRepository', () => {
  let repo: AuthorRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
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
