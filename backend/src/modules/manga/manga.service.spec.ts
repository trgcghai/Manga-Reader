import { Test, TestingModule } from '@nestjs/testing';
import { MangaService } from './manga.service';
import { NotFoundException } from '@nestjs/common';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { CreateMangaDto } from 'src/modules/manga/dto/manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';
import { GenreRepository } from 'src/modules/manga/genre.repository';
import { AuthorRepository } from 'src/modules/manga/author.repository';

describe('MangaService', () => {
  let service: MangaService;

  const mockMangaRepository = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findAllPaginated: jest.fn(),
    create: jest.fn(),
  };

  const mockAuthorRepo = {
    findOneByName: jest.fn(),
    create: jest.fn(),
  };

  const mockGenreRepo = {
    findOneByName: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaService,
        { provide: MangaRepository, useValue: mockMangaRepository },
        { provide: AuthorRepository, useValue: mockAuthorRepo },
        { provide: GenreRepository, useValue: mockGenreRepo },
      ],
    }).compile();

    service = module.get(MangaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated mangas when page and limit provided', async () => {
      const paginatedResult = {
        data: [{ id: 1, title: 'Naruto' } as Manga],
        total: 1,
      };
      mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(paginatedResult);
      expect(mockMangaRepository.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('findOne', () => {
    it('should return manga when found', async () => {
      mockMangaRepository.findOneById.mockResolvedValue({
        id: 1,
        title: 'Naruto',
      });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when manga not found', async () => {
      mockMangaRepository.findOneById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create manga with new authors and genres', async () => {
      const dto: CreateMangaDto = {
        title: 'Berserk',
        status: MangaStatus.ONGOING,
        authors: ['Kentaro Miura'],
        genres: ['Fantasy'],
      };

      const author = { id: 1, name: 'Kentaro Miura' } as Author;
      const genre = { id: 1, name: 'Fantasy' } as Genre;
      const savedManga = {
        id: 1,
        title: 'Berserk',
        authors: [author],
        genres: [genre],
      } as Manga;

      mockAuthorRepo.findOneByName.mockResolvedValue(null);
      mockAuthorRepo.create.mockResolvedValue(author);
      mockGenreRepo.findOneByName.mockResolvedValue(null);
      mockGenreRepo.create.mockResolvedValue(genre);
      mockMangaRepository.create.mockResolvedValue(savedManga);

      const result = await service.create(dto);

      expect(result.title).toBe('Berserk');
      expect(mockMangaRepository.create).toHaveBeenCalledWith({
        title: 'Berserk',
        status: MangaStatus.ONGOING,
        description: undefined,
        alternativeTitles: undefined,
        coverPath: undefined,
        authors: [author],
        genres: [genre],
      });
    });

    it('should reuse existing authors and genres', async () => {
      const dto: CreateMangaDto = {
        title: 'Test',
        status: MangaStatus.ONGOING,
        authors: ['Existing Author'],
        genres: ['Existing Genre'],
      };

      const existingAuthor = { id: 5, name: 'Existing Author' } as Author;
      const existingGenre = { id: 3, name: 'Existing Genre' } as Genre;
      const savedManga = {
        id: 2,
        title: 'Test',
        authors: [existingAuthor],
        genres: [existingGenre],
      } as Manga;

      mockAuthorRepo.findOneByName.mockResolvedValue(existingAuthor);
      mockGenreRepo.findOneByName.mockResolvedValue(existingGenre);
      mockMangaRepository.create.mockResolvedValue(savedManga);

      const result = await service.create(dto);

      expect(result.id).toBe(2);
      expect(mockAuthorRepo.create).not.toHaveBeenCalled();
      expect(mockGenreRepo.create).not.toHaveBeenCalled();
    });
  });
});
