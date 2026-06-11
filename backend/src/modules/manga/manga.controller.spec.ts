import { Test, TestingModule } from '@nestjs/testing';
import { MangaController } from './manga.controller';
import { MangaService } from './manga.service';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateMangaDto } from 'src/modules/manga/dto/manga.dto';
import { MangaStatus } from 'src/common/constants/manga.constant';

describe('MangaController', () => {
  let controller: MangaController;
  let service: jest.Mocked<MangaService>;

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
          },
        },
      ],
    }).compile();

    controller = module.get<MangaController>(MangaController);
    service = module.get(MangaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return manga list without pagination', async () => {
      service.findAll.mockResolvedValue(mockMangaList);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockMangaList);
    });

    it('should return paginated result when page and limit provided', async () => {
      const paginatedResult = {
        data: mockMangaList,
        total: 2,
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
});
