import { Test, TestingModule } from '@nestjs/testing';
import { GenreService } from './genre.service';
import { GenreRepository } from './genre.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Genre } from 'src/modules/manga/entities/genre.entity';

describe('GenreService', () => {
  let service: GenreService;
  const mockRepo = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOneByName: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenreService,
        { provide: GenreRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(GenreService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      mockRepo.findAll.mockResolvedValue(expected);
      expect(await service.findAll('search', 2, 10)).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith('search', 2, 10);
    });
  });

  describe('findOne', () => {
    it('should return genre when found', async () => {
      const genre = { id: 1, name: 'Fantasy' } as Genre;
      mockRepo.findOneById.mockResolvedValue(genre);
      expect(await service.findOne(1)).toEqual(genre);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreate', () => {
    it('should return existing genre when found', async () => {
      const genre = { id: 1, name: 'Fantasy' } as Genre;
      mockRepo.findOneByName.mockResolvedValue(genre);

      const result = await service.findOrCreate('Fantasy');

      expect(result).toEqual(genre);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should create and return new genre when not found', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 2, name: 'New Genre' } as Genre;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.findOrCreate('New Genre');

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Genre' });
    });
  });

  describe('create', () => {
    it('should create a new genre', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 1, name: 'Action' } as Genre;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({ name: 'Action' });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'Action' });
    });

    it('should throw BadRequestException on duplicate name', async () => {
      mockRepo.findOneByName.mockResolvedValue({
        id: 1,
        name: 'Existing',
      });
      await expect(service.create({ name: 'Existing' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update genre name', async () => {
      const existing = { id: 1, name: 'Old' } as Genre;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(null);
      const updated = { id: 1, name: 'New' } as Genre;
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'New' });

      expect(result).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New' });
    });

    it('should throw NotFoundException when genre does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when new name is taken', async () => {
      const existing = { id: 1, name: 'Old' } as Genre;
      const taken = { id: 2, name: 'Taken' } as Genre;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(taken);
      await expect(service.update(1, { name: 'Taken' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete existing genre', async () => {
      mockRepo.findOneById.mockResolvedValue({ id: 1 });
      mockRepo.delete.mockResolvedValue(true);
      await service.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when genre does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
