import { Test, TestingModule } from '@nestjs/testing';
import { MangaService } from './manga.service';
import { NotFoundException } from '@nestjs/common';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';

describe('MangaService', () => {
  let service: MangaService;
  let repo: jest.Mocked<MangaRepository>;

  const mockMangaRepository = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaService,
        {
          provide: MangaRepository,
          useValue: mockMangaRepository,
        },
      ],
    }).compile();

    service = module.get(MangaService);
    repo = module.get(MangaRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('findAll should return manga list', async () => {
      repo.findAll.mockResolvedValue([{ id: 1, title: 'Naruto' }] as Manga[]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('findOne should return manga when found', async () => {
      repo.findOneById.mockResolvedValue({ id: 1, title: 'Naruto' } as Manga);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
    });

    it('findOne should throw NotFoundException when manga not found', async () => {
      repo.findOneById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
