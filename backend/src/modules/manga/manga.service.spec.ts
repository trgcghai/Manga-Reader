import { Test, TestingModule } from '@nestjs/testing';
import { MangaService } from './manga.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateMangaDto } from 'src/modules/manga/dto/update-manga.dto';
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
    findOneByIdWithRelations: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue({
        id: 1,
        title: 'Naruto',
        authors: [],
        genres: [],
      });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when manga not found', async () => {
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(null);

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

  describe('update', () => {
    it('should update scalar fields successfully', async () => {
      const existingManga = {
        id: 1,
        title: 'Old Title',
        status: 'ongoing',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const dto = {
        title: 'New Title',
        status: MangaStatus.COMPLETED,
      } as UpdateMangaDto;
      const updatedManga = {
        ...existingManga,
        title: 'New Title',
        status: MangaStatus.COMPLETED,
      } as Manga;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockResolvedValue(updatedManga);

      const result = await service.update(1, dto);

      expect(result.title).toBe('New Title');
      expect(result.status).toBe(MangaStatus.COMPLETED);
      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'New Title',
          status: MangaStatus.COMPLETED,
        }),
      );
    });

    it('should update only a subset of fields', async () => {
      const existingManga = {
        id: 1,
        title: 'Original',
        status: 'ongoing',
        description: 'Orig desc',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const dto = { description: 'Updated desc' } as UpdateMangaDto;
      const updatedManga = {
        ...existingManga,
        description: 'Updated desc',
      };

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockResolvedValue(updatedManga);

      const result = await service.update(1, dto);

      expect(result.description).toBe('Updated desc');
      expect(result.title).toBe('Original');
    });

    it('should replace authors list when provided', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [{ id: 1, name: 'Old Author' }],
        genres: [],
      } as unknown as Manga;
      const dto = { authors: ['New Author'] } as UpdateMangaDto;
      const newAuthor = { id: 2, name: 'New Author' } as Author;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorRepo.findOneByName.mockResolvedValue(null);
      mockAuthorRepo.create.mockResolvedValue(newAuthor);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [newAuthor],
      });

      await service.update(1, dto);

      expect(mockAuthorRepo.findOneByName).toHaveBeenCalledWith('New Author');
      expect(mockAuthorRepo.create).toHaveBeenCalledWith({
        name: 'New Author',
      });
      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          authors: [newAuthor],
        }),
      );
    });

    it('should replace genres list when provided', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [{ id: 1, name: 'Old Genre' }],
      } as unknown as Manga;
      const dto = { genres: ['New Genre'] } as UpdateMangaDto;
      const newGenre = { id: 2, name: 'New Genre' } as Genre;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockGenreRepo.findOneByName.mockResolvedValue(null);
      mockGenreRepo.create.mockResolvedValue(newGenre);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        genres: [newGenre],
      });

      await service.update(1, dto);

      expect(mockGenreRepo.findOneByName).toHaveBeenCalledWith('New Genre');
      expect(mockGenreRepo.create).toHaveBeenCalledWith({ name: 'New Genre' });
      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          genres: [newGenre],
        }),
      );
    });

    it('should leave existing authors/genres when not provided in dto', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [{ id: 1, name: 'Existing Author' }],
        genres: [{ id: 1, name: 'Existing Genre' }],
      } as unknown as Manga;
      const dto = { title: 'Updated' } as UpdateMangaDto;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        title: 'Updated',
      });

      await service.update(1, dto);

      expect(mockAuthorRepo.findOneByName).not.toHaveBeenCalled();
      expect(mockGenreRepo.findOneByName).not.toHaveBeenCalled();
      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'Updated',
        }),
      );
    });

    it('should create new author entities from new names', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const dto = { authors: ['Author A', 'Author B'] } as UpdateMangaDto;
      const authorA = { id: 1, name: 'Author A' } as Author;
      const authorB = { id: 2, name: 'Author B' } as Author;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorRepo.findOneByName.mockResolvedValueOnce(null);
      mockAuthorRepo.create.mockResolvedValueOnce(authorA);
      mockAuthorRepo.findOneByName.mockResolvedValueOnce(null);
      mockAuthorRepo.create.mockResolvedValueOnce(authorB);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [authorA, authorB],
      });

      const result = await service.update(1, dto);

      expect(mockAuthorRepo.create).toHaveBeenCalledTimes(2);
      expect(result.authors).toHaveLength(2);
    });

    it('should reuse existing authors by name', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const dto = { authors: ['Existing Author'] } as UpdateMangaDto;
      const author = { id: 5, name: 'Existing Author' } as Author;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorRepo.findOneByName.mockResolvedValue(author);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [author],
      });

      await service.update(1, dto);

      expect(mockAuthorRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(null);

      await expect(service.update(999, { title: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle empty authors array (clear relations)', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [{ id: 1, name: 'Old' }],
        genres: [],
      } as unknown as Manga;
      const dto = { authors: [] } as UpdateMangaDto;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [],
      });

      const result = await service.update(1, dto);

      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          authors: [],
        }),
      );
      expect(result.authors).toEqual([]);
    });

    it('should throw BadRequestException when no updatable fields provided', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );

      await expect(service.update(1, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete existing manga successfully', async () => {
      mockMangaRepository.findOneById.mockResolvedValue({ id: 1 });
      mockMangaRepository.delete.mockResolvedValue(true);

      await service.delete(1);

      expect(mockMangaRepository.findOneById).toHaveBeenCalledWith(1);
      expect(mockMangaRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when manga does not exist', async () => {
      mockMangaRepository.findOneById.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockMangaRepository.delete).not.toHaveBeenCalled();
    });
  });
});
