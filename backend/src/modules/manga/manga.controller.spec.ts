/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { MangaController } from './manga.controller';
import { MangaService } from './manga.service';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { ImportMangaService } from './services/import-manga.service';
import { ChapterService } from './services/chapter.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';

describe('MangaController', () => {
  let controller: MangaController;
  let service: jest.Mocked<MangaService>;
  let importService: jest.Mocked<ImportMangaService>;
  let chapterService: jest.Mocked<ChapterService>;

  const mockMangaList: Manga[] = [
    { id: 1, title: 'One Piece' } as Manga,
    { id: 2, title: 'Naruto' } as Manga,
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MangaController],
      providers: [
        {
          provide: MangaService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ImportMangaService,
          useValue: {
            import: jest.fn(),
          },
        },
        {
          provide: ChapterService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MangaController>(MangaController);
    service = module.get(MangaService);
    importService = module.get(ImportMangaService);
    chapterService = module.get(ChapterService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated mangas with defaults', async () => {
      const paginatedResult = {
        data: mockMangaList,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(paginatedResult);
    });

    it('should return paginated result when page and limit provided', async () => {
      const paginatedResult = {
        data: mockMangaList,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll('1', '20');

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a manga when found', async () => {
      service.findOne.mockResolvedValue(mockMangaList[0]);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockMangaList[0]);
    });

    it('should throw NotFoundException when manga not found', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Manga with ID 999 not found'),
      );

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new manga', async () => {
      const dto: CreateMangaDto = {
        title: 'Berserk',
        status: MangaStatus.ONGOING,
        authors: ['Kentaro Miura'],
        genres: ['Action', 'Fantasy'],
      };
      const createdManga = { id: 3, ...dto } as unknown as Manga;
      service.create.mockResolvedValue(createdManga);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(createdManga);
    });
  });

  describe('update', () => {
    it('should update and return the manga', async () => {
      const dto: UpdateMangaDto = { title: 'Updated Title' };
      const updatedManga = { id: 1, title: 'Updated Title' } as Manga;
      service.update.mockResolvedValue(updatedManga);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedManga);
    });

    it('should throw NotFoundException when manga not found', async () => {
      const dto: UpdateMangaDto = { title: 'Nope' };
      service.update.mockRejectedValue(
        new NotFoundException('Manga with ID 999 not found'),
      );

      await expect(controller.update('999', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should pass authors and genres in update dto to service', async () => {
      const dto: UpdateMangaDto = {
        title: 'Updated',
        authors: ['Author1', 'Author2'],
        genres: ['Genre1'],
      };
      const updatedManga = {
        id: 1,
        title: 'Updated',
        authors: [
          { id: 1, name: 'Author1' },
          { id: 2, name: 'Author2' },
        ],
        genres: [{ id: 1, name: 'Genre1' }],
      } as unknown as Manga;
      service.update.mockResolvedValue(updatedManga);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedManga);
    });

    it('should throw BadRequestException when service throws it', async () => {
      const dto: UpdateMangaDto = {};
      service.update.mockRejectedValue(
        new BadRequestException('No updatable fields provided'),
      );

      await expect(controller.update('1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete and return 204 (undefined)', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when manga not found', async () => {
      service.delete.mockRejectedValue(
        new NotFoundException('Manga with ID 999 not found'),
      );

      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('import', () => {
    it('should call ImportMangaService.import with the uploaded file', async () => {
      const mockFile = {
        buffer: Buffer.from('fake'),
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as Express.Multer.File;
      const importResult = { total: 2, created: 2, errors: [] };
      importService.import.mockResolvedValue(importResult);

      const result = await controller.import(mockFile);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(importService.import).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual(importResult);
    });

    it('should return 400 when no file provided', async () => {
      await expect(controller.import(undefined as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createChapter', () => {
    const chapterDto = {
      number: 1,
      title: 'Chapter 1',
      languageId: 1,
      translatorId: 1,
      folderPath: '/chapters/1',
    };

    it('should call ChapterService.create and return 201', async () => {
      const expected = { id: 1, ...chapterDto };
      chapterService.create.mockResolvedValue(expected as any);

      const result = await controller.createChapter(1, chapterDto);

      expect(chapterService.create).toHaveBeenCalledWith(1, chapterDto);
      expect(result).toEqual(expected);
    });

    it('should propagate NotFoundException from ChapterService', async () => {
      chapterService.create.mockRejectedValue(
        new NotFoundException('Manga #999 not found'),
      );

      await expect(
        controller.createChapter(999, chapterDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should propagate ConflictException from ChapterService', async () => {
      chapterService.create.mockRejectedValue(
        new ConflictException(
          'A translation for chapter #1 with this language and translator already exists',
        ),
      );

      await expect(
        controller.createChapter(1, chapterDto as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});
