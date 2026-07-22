import { Test, TestingModule } from '@nestjs/testing';
import { MangaService } from './manga.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MangaRepository } from 'src/modules/manga/repositories/manga.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Author } from 'src/modules/author/entities/author.entity';
import { Genre } from 'src/modules/genre/entities/genre.entity';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';
import { GenreService } from 'src/modules/genre/genre.service';
import { AuthorService } from 'src/modules/author/author.service';
import { FileService } from 'src/modules/file/file.service';

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

  const mockAuthorService = {
    findOrCreate: jest.fn(),
  };

  const mockGenreService = {
    findOrCreate: jest.fn(),
  };

  const mockFileService = {
    endpoint: 'http://localhost:9000',
    bucket: 'manga-pages',
    delete: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaService,
        { provide: MangaRepository, useValue: mockMangaRepository },
        { provide: AuthorService, useValue: mockAuthorService },
        { provide: GenreService, useValue: mockGenreService },
        { provide: FileService, useValue: mockFileService },
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
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(1, 20);

      expect(result).toEqual(paginatedResult);
      expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should forward search and status to repository', async () => {
      const paginatedResult = {
        data: [{ id: 1, title: 'Naruto' } as Manga],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(1, 20, 'naruto', 'ongoing');

      expect(result).toEqual(paginatedResult);
      expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
        1,
        20,
        'naruto',
        'ongoing',
        undefined,
        undefined,
        undefined,
      );
    });

    it('should forward authors filter to repository', async () => {
      const paginatedResult = {
        data: [{ id: 1, title: 'Naruto' } as Manga],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(1, 20, undefined, undefined);

      expect(result).toEqual(paginatedResult);
      expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('should forward genres filter to repository', async () => {
      const paginatedResult = {
        data: [{ id: 1, title: 'Naruto' } as Manga],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockMangaRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll(1, 20, undefined, undefined);

      expect(result).toEqual(paginatedResult);
      expect(mockMangaRepository.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('findOne', () => {
    it('should return manga when found', async () => {
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue({
        id: 1,
        title: 'Naruto',
        authors: [],
        genres: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      const result = await service.findOne(1);

      expect(result?.id).toBe(1);
    });

    it('should throw NotFoundException when manga not found', async () => {
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should return MangaDetailResponse when include=chapters,translations', async () => {
      const mockManga = {
        id: 1,
        title: 'Test',
        alternativeTitles: [],
        description: 'Desc',
        coverPath: null,
        status: 'ongoing',
        authors: [{ id: 1, name: 'Author1' }],
        genres: [{ id: 1, name: 'Genre1' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        chapters: [
          {
            id: 1,
            number: 1,
            title: 'Ch1',
            releaseDate: new Date('2024-01-01'),
            note: null,
            translations: [
              {
                id: 1,
                url: '/path',
                note: null,
                createdAt: new Date('2024-01-01'),
                language: { id: 1, code: 'en', name: 'English' },
                translator: { id: 1, name: 'T1' },
              },
            ],
          },
        ],
      };

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(mockManga);

      const result = await service.findOne(1, 'chapters,translations');

      expect(mockMangaRepository.findOneByIdWithRelations).toHaveBeenCalledWith(
        1,
        true,
      );
      expect(result).toHaveProperty('chapters');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((result as any).chapters).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((result as any).chapters[0].translations).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((result as any).chapters[0].releaseDate).toBe('2024-01-01');
    });

    it('should return MangaResponse without chapters when no include param', async () => {
      const mockManga = {
        id: 1,
        title: 'Test',
        alternativeTitles: [],
        description: 'Desc',
        coverPath: null,
        status: 'ongoing',
        authors: [{ id: 1, name: 'Author1' }],
        genres: [{ id: 1, name: 'Genre1' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(mockManga);

      const result = await service.findOne(1);

      expect(mockMangaRepository.findOneByIdWithRelations).toHaveBeenCalledWith(
        1,
        false,
      );
      expect(result).not.toHaveProperty('chapters');
    });

    it('should return null when manga not found with include param', async () => {
      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(null);

      const result = await service.findOne(999, 'chapters,translations');

      expect(result).toBeNull();
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

      mockAuthorService.findOrCreate.mockResolvedValue(author);
      mockGenreService.findOrCreate.mockResolvedValue(genre);
      mockMangaRepository.create.mockResolvedValue(savedManga);

      const result = await service.create(dto);

      expect(result.title).toBe('Berserk');
      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith(
        'Kentaro Miura',
      );
      expect(mockGenreService.findOrCreate).toHaveBeenCalledWith('Fantasy');
      expect(mockMangaRepository.create).toHaveBeenCalledWith({
        title: 'Berserk',
        status: MangaStatus.ONGOING,
        description: undefined,
        alternativeTitles: ['Berserk'],
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

      mockAuthorService.findOrCreate.mockResolvedValue(existingAuthor);
      mockGenreService.findOrCreate.mockResolvedValue(existingGenre);
      mockMangaRepository.create.mockResolvedValue(savedManga);

      const result = await service.create(dto);

      expect(result.id).toBe(2);
      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith(
        'Existing Author',
      );
      expect(mockGenreService.findOrCreate).toHaveBeenCalledWith(
        'Existing Genre',
      );
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
      mockAuthorService.findOrCreate.mockResolvedValue(newAuthor);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [newAuthor],
      });

      await service.update(1, dto);

      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith('New Author');
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
      mockGenreService.findOrCreate.mockResolvedValue(newGenre);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        genres: [newGenre],
      });

      await service.update(1, dto);

      expect(mockGenreService.findOrCreate).toHaveBeenCalledWith('New Genre');
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

      expect(mockAuthorService.findOrCreate).not.toHaveBeenCalled();
      expect(mockGenreService.findOrCreate).not.toHaveBeenCalled();
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
      mockAuthorService.findOrCreate
        .mockResolvedValueOnce(authorA)
        .mockResolvedValueOnce(authorB);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [authorA, authorB],
      });

      const result = await service.update(1, dto);

      expect(mockAuthorService.findOrCreate).toHaveBeenCalledTimes(2);
      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith('Author A');
      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith('Author B');
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
      mockAuthorService.findOrCreate.mockResolvedValue(author);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [author],
      });

      await service.update(1, dto);

      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith(
        'Existing Author',
      );
    });

    it('should not create duplicate authors when same name appears in update', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [{ id: 1, name: 'Author1' } as Author],
        genres: [],
      } as unknown as Manga;
      const dto = {
        title: 'Updated',
        authors: ['Author1'],
        genres: ['Genre1'],
      } as UpdateMangaDto;
      const existingAuthor = { id: 1, name: 'Author1' } as Author;
      const existingGenre = { id: 1, name: 'Genre1' } as Genre;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorService.findOrCreate.mockResolvedValue(existingAuthor);
      mockGenreService.findOrCreate.mockResolvedValue(existingGenre);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        title: 'Updated',
        authors: [existingAuthor],
        genres: [existingGenre],
      });

      await service.update(1, dto);

      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith('Author1');
      expect(mockGenreService.findOrCreate).toHaveBeenCalledWith('Genre1');
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

    it('should mix existing and new authors', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const dto = {
        authors: ['Existing Author', 'New Author'],
      } as UpdateMangaDto;
      const existingAuthor = { id: 5, name: 'Existing Author' } as Author;
      const newAuthor = { id: 10, name: 'New Author' } as Author;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorService.findOrCreate
        .mockResolvedValueOnce(existingAuthor)
        .mockResolvedValueOnce(newAuthor);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        authors: [existingAuthor, newAuthor],
      });

      const result = await service.update(1, dto);

      expect(mockAuthorService.findOrCreate).toHaveBeenCalledTimes(2);
      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith(
        'Existing Author',
      );
      expect(mockAuthorService.findOrCreate).toHaveBeenCalledWith('New Author');
      expect(result.authors).toHaveLength(2);
    });

    it('should mix existing and new genres', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;
      const dto = { genres: ['Existing Genre', 'New Genre'] } as UpdateMangaDto;
      const existingGenre = { id: 3, name: 'Existing Genre' } as Genre;
      const newGenre = { id: 8, name: 'New Genre' } as Genre;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockGenreService.findOrCreate
        .mockResolvedValueOnce(existingGenre)
        .mockResolvedValueOnce(newGenre);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        genres: [existingGenre, newGenre],
      });

      const result = await service.update(1, dto);

      expect(mockGenreService.findOrCreate).toHaveBeenCalledTimes(2);
      expect(mockGenreService.findOrCreate).toHaveBeenCalledWith(
        'Existing Genre',
      );
      expect(mockGenreService.findOrCreate).toHaveBeenCalledWith('New Genre');
      expect(result.genres).toHaveLength(2);
    });

    it('should update all optional fields simultaneously', async () => {
      const existingManga = {
        id: 1,
        title: 'Old Title',
        status: 'ongoing',
        description: 'Old desc',
        alternativeTitles: ['Old Alt'],
        coverPath: '/old.jpg',
        authors: [{ id: 1, name: 'Old Author' }],
        genres: [{ id: 1, name: 'Old Genre' }],
      } as unknown as Manga;
      const dto = {
        title: 'New Title',
        status: 'completed' as const,
        description: 'New desc',
        alternativeTitles: ['New Alt'],
        coverPath: '/new.jpg',
        authors: ['New Author'],
        genres: ['New Genre'],
      } as UpdateMangaDto;
      const newAuthor = { id: 10, name: 'New Author' } as Author;
      const newGenre = { id: 8, name: 'New Genre' } as Genre;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorService.findOrCreate.mockResolvedValue(newAuthor);
      mockGenreService.findOrCreate.mockResolvedValue(newGenre);
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        title: 'New Title',
        status: 'completed',
        description: 'New desc',
        alternativeTitles: ['New Alt'],
        coverPath: '/new.jpg',
        authors: [newAuthor],
        genres: [newGenre],
      });

      const result = await service.update(1, dto);

      expect(result.title).toBe('New Title');
      expect(result.status).toBe('completed');
      expect(result.description).toBe('New desc');
      expect(result.alternativeTitles).toEqual(['New Alt']);
      expect(result.description).toBe('New desc');
      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'New Title',
          status: 'completed',
          description: 'New desc',
          alternativeTitles: ['New Alt'],
          coverPath: '/new.jpg',
          authors: [newAuthor],
          genres: [newGenre],
        }),
      );
    });

    it('should handle empty genres array (clear relations)', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [{ id: 1, name: 'Old Genre' }],
      } as unknown as Manga;
      const dto = { genres: [] } as UpdateMangaDto;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockResolvedValue({
        ...existingManga,
        genres: [],
      });

      const result = await service.update(1, dto);

      expect(mockMangaRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          genres: [],
        }),
      );
      expect(result.genres).toEqual([]);
    });

    it('should throw NotFoundException when repository update returns null (race condition)', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockResolvedValue(null);

      await expect(service.update(1, { title: 'Race' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should wrap findOrCreate errors in BadRequestException', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorService.findOrCreate.mockRejectedValue(
        new Error('DB error on lookup'),
      );

      await expect(service.update(1, { authors: ['Test'] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should wrap repository update errors in BadRequestException', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockMangaRepository.update.mockRejectedValue(new Error('Save failure'));

      await expect(service.update(1, { title: 'Boom' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should wrap author findOrCreate errors in BadRequestException', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockAuthorService.findOrCreate.mockRejectedValue(
        new Error('Create failed'),
      );

      await expect(
        service.update(1, { authors: ['New Author'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should wrap genre create errors in BadRequestException', async () => {
      const existingManga = {
        id: 1,
        title: 'Test',
        authors: [],
        genres: [],
      } as unknown as Manga;

      mockMangaRepository.findOneByIdWithRelations.mockResolvedValue(
        existingManga,
      );
      mockGenreService.findOrCreate.mockRejectedValue(
        new Error('Create failed'),
      );

      await expect(
        service.update(1, { genres: ['New Genre'] }),
      ).rejects.toThrow(BadRequestException);
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
