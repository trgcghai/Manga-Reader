import { Test, TestingModule } from '@nestjs/testing';
import { MangaService } from './manga.service';
import { NotFoundException } from '@nestjs/common';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { CreateMangaDto } from 'src/modules/manga/dto/create-manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';
import { Repository } from 'typeorm';

describe('MangaService', () => {
  let service: MangaService;
  let repo: jest.Mocked<MangaRepository>;
  let authorRepo: jest.Mocked<Repository<Author>>;
  let genreRepo: jest.Mocked<Repository<Genre>>;

  const mockMangaRepository = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findAllPaginated: jest.fn(),
    create: jest.fn(),
  };

  const mockAuthorRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockGenreRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaService,
        { provide: MangaRepository, useValue: mockMangaRepository },
        { provide: getRepositoryToken(Author), useValue: mockAuthorRepo },
        { provide: getRepositoryToken(Genre), useValue: mockGenreRepo },
      ],
    }).compile();

    service = module.get(MangaService);
    repo = module.get(MangaRepository);
    authorRepo = module.get(getRepositoryToken(Author));
    genreRepo = module.get(getRepositoryToken(Genre));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all mangas without pagination', async () => {
      repo.findAll.mockResolvedValue([{ id: 1, title: 'Naruto' }] as Manga[]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(repo.findAll).toHaveBeenCalled();
    });

    it('should return paginated mangas when page and limit provided', async () => {
      const paginatedResult = { data: [{ id: 1, title: 'Naruto' } as Manga], total: 1 };
      repo.findAllPaginated.mockResolvedValue(paginatedResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(paginatedResult);
      expect(repo.findAllPaginated).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('findOne', () => {
    it('should return manga when found', async () => {
      repo.findOneById.mockResolvedValue({ id: 1, title: 'Naruto' } as Manga);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when manga not found', async () => {
      repo.findOneById.mockResolvedValue(null);

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
      const savedManga = { id: 1, title: 'Berserk', authors: [author], genres: [genre] } as Manga;

      mockAuthorRepo.findOne.mockResolvedValue(null);
      mockAuthorRepo.create.mockReturnValue(author);
      mockAuthorRepo.save.mockResolvedValue(author);
      mockGenreRepo.findOne.mockResolvedValue(null);
      mockGenreRepo.create.mockReturnValue(genre);
      mockGenreRepo.save.mockResolvedValue(genre);
      mockMangaRepository.create.mockResolvedValue(savedManga);
      mockMangaRepository.findOneById.mockResolvedValue(savedManga);

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
      const savedManga = { id: 2, title: 'Test', authors: [existingAuthor], genres: [existingGenre] } as Manga;

      mockAuthorRepo.findOne.mockResolvedValue(existingAuthor);
      mockGenreRepo.findOne.mockResolvedValue(existingGenre);
      mockMangaRepository.create.mockResolvedValue(savedManga);
      mockMangaRepository.findOneById.mockResolvedValue(savedManga);

      const result = await service.create(dto);

      expect(result.id).toBe(2);
      expect(mockAuthorRepo.create).not.toHaveBeenCalled();
      expect(mockGenreRepo.create).not.toHaveBeenCalled();
    });
  });
});
