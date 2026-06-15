import { Repository } from 'typeorm';
import { TranslatorRepository } from './translator.repository';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('TranslatorRepository', () => {
  let repo: TranslatorRepository;
  const mockRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(() => {
    repo = new TranslatorRepository(
      mockRepo as unknown as Repository<Translator>,
    );
    jest.clearAllMocks();
  });

  describe('findOneByName', () => {
    it('should find translator by exact name match', async () => {
      const translator = { id: 1, name: 'Test Translator' } as Translator;
      mockRepo.findOne.mockResolvedValue(translator);

      const result = await repo.findOneByName('Test Translator');

      expect(result).toEqual(translator);
    });

    it('should trim whitespace from name before querying', async () => {
      const translator = { id: 1, name: 'Test Translator' } as Translator;
      mockRepo.findOne.mockResolvedValue(translator);

      await repo.findOneByName('  Test Translator  ');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Test Translator' },
      });
    });

    it('should return null when no matching translator exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneByName('Nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated translators without search', async () => {
      const translators = [
        { id: 1, name: 'Translator A' },
        { id: 2, name: 'Translator B' },
      ] as Translator[];
      const count = 2;

      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([translators, count]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repo.findAll();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('translator');
      expect(mockQb.orderBy).toHaveBeenCalledWith('translator.name', 'ASC');
      expect(result).toEqual({
        data: translators,
        total: count,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply ILIKE search filter when search param provided', async () => {
      const translators = [{ id: 1, name: 'Test Translator' }] as Translator[];
      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([translators, 1]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await repo.findAll('test');

      expect(mockQb.where).toHaveBeenCalledWith(
        'translator.name ILIKE :search',
        {
          search: '%test%',
        },
      );
    });

    it('should calculate correct totalPages', async () => {
      const translators = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Translator ${i + 1}`,
      })) as Translator[];
      const mockQb = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([translators, 25]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await repo.findAll(undefined, 1, 10);

      expect(result.totalPages).toBe(3);
      expect(result.total).toBe(25);
      expect(result.limit).toBe(10);
    });
  });

  describe('findOneById', () => {
    it('should find translator by id', async () => {
      const translator = { id: 1, name: 'Test' } as Translator;
      mockRepo.findOne.mockResolvedValue(translator);

      const result = await repo.findOneById(1);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(translator);
    });

    it('should return null when not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.findOneById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update translator name and note', async () => {
      const existing = {
        id: 1,
        name: 'Old Name',
        note: 'Old note',
      } as Translator;
      const saved = { id: 1, name: 'New Name', note: 'New note' } as Translator;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.update(1, {
        name: 'New Name',
        note: 'New note',
      });

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(existing.name).toBe('New Name');
      expect(existing.note).toBe('New note');
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(saved);
    });

    it('should return null when translator not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await repo.update(999, { name: 'Nope' });

      expect(result).toBeNull();
    });

    it('should only update provided fields', async () => {
      const existing = { id: 1, name: 'Name', note: 'Note' } as Translator;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, name: 'Updated' });

      const result = await repo.update(1, { name: 'Updated' });

      expect(existing.name).toBe('Updated');
      expect(existing.note).toBe('Note');
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
    it('should save and return new translator', async () => {
      const translatorData = { name: 'New Translator', note: 'Note' };
      const saved = {
        id: 1,
        name: 'New Translator',
        note: 'Note',
      } as Translator;
      mockRepo.save.mockResolvedValue(saved);

      const result = await repo.create(translatorData);

      expect(mockRepo.save).toHaveBeenCalledWith(translatorData);
      expect(result).toEqual(saved);
    });
  });
});
