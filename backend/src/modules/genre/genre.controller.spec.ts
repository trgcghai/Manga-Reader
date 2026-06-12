/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { GenreController } from './genre.controller';
import { GenreService } from './genre.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateGenreDto } from 'src/modules/genre/dto/create-genre.dto';
import { UpdateGenreDto } from 'src/modules/genre/dto/update-genre.dto';
import { Genre } from 'src/modules/genre/entities/genre.entity';

describe('GenreController', () => {
  let controller: GenreController;
  let service: jest.Mocked<GenreService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenreController],
      providers: [
        {
          provide: GenreService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GenreController>(GenreController);
    service = module.get(GenreService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated genres', async () => {
      const expected = {
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('search', '2', '10');

      expect(service.findAll).toHaveBeenCalledWith('search', 2, 10);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return genre by id', async () => {
      const genre = { id: 1, name: 'Fantasy' } as unknown as Genre;
      service.findOne.mockResolvedValue(genre);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(genre);
    });

    it('should throw NotFoundException when genre not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new genre', async () => {
      const dto: CreateGenreDto = { name: 'Fantasy' };
      const created = { id: 1, name: 'Fantasy' } as unknown as Genre;
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException on duplicate name', async () => {
      service.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ name: 'Duplicate' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update and return the genre', async () => {
      const dto: UpdateGenreDto = { name: 'Updated' };
      const updated = { id: 1, name: 'Updated' } as unknown as Genre;
      service.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when genre not found', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete genre', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when genre not found', async () => {
      service.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
