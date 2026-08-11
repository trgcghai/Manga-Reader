/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { Repository } from 'typeorm';
import { TrackingRepository } from './tracking.repository';
import { TrackingSource } from './entities/tracking-source.entity';
import { TrackingConfig } from './entities/tracking-config.entity';

describe('TrackingRepository', () => {
  let repo: TrackingRepository;
  let mockSourceRepo: jest.Mocked<Repository<TrackingSource>>;
  let mockConfigRepo: jest.Mocked<Repository<TrackingConfig>>;

  const createQueryBuilderMock = (
    overrides: {
      andWhere?: jest.Mock;
      getManyAndCount?: jest.Mock;
    } = {},
  ) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: overrides.andWhere ?? jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: overrides.getManyAndCount ?? jest.fn(),
  });

  beforeEach(() => {
    mockSourceRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<TrackingSource>>;
    mockConfigRepo = {
      find: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<TrackingConfig>>;
    repo = new TrackingRepository(mockSourceRepo, mockConfigRepo);
  });

  describe('findAllSourcesPaginated', () => {
    it('should filter by search term across source name and manga title', async () => {
      const mockData = [{ id: 1 }] as TrackingSource[];
      const createQueryBuilder = jest.fn();
      const andWhere = jest.fn().mockReturnThis();
      const getManyAndCount = jest.fn().mockResolvedValue([mockData, 1]);
      const qb = createQueryBuilderMock({ andWhere, getManyAndCount });
      mockSourceRepo.createQueryBuilder = createQueryBuilder;
      createQueryBuilder.mockReturnValue(qb as any);

      const result = await repo.findAllSourcesPaginated(
        undefined,
        1,
        20,
        'naruto',
      );

      expect(createQueryBuilder).toHaveBeenCalledWith('source');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'source.manga',
        'manga',
      );
      expect(andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(source.name) LIKE LOWER(:search)'),
        { search: '%naruto%' },
      );
      expect(andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(manga.title)'),
        { search: '%naruto%' },
      );
      expect(getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({
        data: mockData,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should combine mangaId and search filters with AND', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockSourceRepo.createQueryBuilder.mockReturnValue(qb as any);

      await repo.findAllSourcesPaginated(24, 1, 20, 'naruto');

      expect(qb.where).toHaveBeenCalledWith('source.mangaId = :mangaId', {
        mangaId: 24,
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(source.name) LIKE LOWER(:search)'),
        { search: '%naruto%' },
      );
    });

    it('should not add a search clause when search is empty or missing', async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockSourceRepo.createQueryBuilder.mockReturnValue(qb as any);

      await repo.findAllSourcesPaginated(undefined, 1, 20, undefined);
      await repo.findAllSourcesPaginated(undefined, 1, 20, '');

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findAllSourcesForCheck', () => {
    it('should return all sources with the manga relation', async () => {
      const mockData = [{ id: 1 }] as TrackingSource[];
      mockSourceRepo.find.mockResolvedValue(mockData);

      const result = await repo.findAllSourcesForCheck();

      expect(mockSourceRepo.find).toHaveBeenCalledWith({
        relations: ['manga'],
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('findByMangaIdForCheck', () => {
    it('should filter by mangaId and load the manga relation', async () => {
      const mockData = [{ id: 1 }] as TrackingSource[];
      const createQueryBuilder = jest.fn();
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockData),
      };
      createQueryBuilder.mockReturnValue(qb as any);
      mockSourceRepo.createQueryBuilder = createQueryBuilder;

      const result = await repo.findByMangaIdForCheck(7);

      expect(createQueryBuilder).toHaveBeenCalledWith('source');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith(
        'source.manga',
        'manga',
      );
      expect(qb.where).toHaveBeenCalledWith('source.mangaId = :mangaId', {
        mangaId: 7,
      });
      expect(result).toEqual(mockData);
    });
  });
});
