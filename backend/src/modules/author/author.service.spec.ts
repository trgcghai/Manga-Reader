import { Test, TestingModule } from '@nestjs/testing';
import { AuthorService } from './author.service';
import { AuthorRepository } from './author.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Author } from 'src/modules/author/entities/author.entity';

describe('AuthorService', () => {
  let service: AuthorService;
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
        AuthorService,
        { provide: AuthorRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(AuthorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated authors', async () => {
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
    it('should return author when found', async () => {
      const author = { id: 1, name: 'Test' } as Author;
      mockRepo.findOneById.mockResolvedValue(author);
      expect(await service.findOne(1)).toEqual(author);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOrCreate', () => {
    it('should return existing author when found', async () => {
      const author = { id: 1, name: 'Existing' } as Author;
      mockRepo.findOneByName.mockResolvedValue(author);

      const result = await service.findOrCreate('Existing');

      expect(result).toEqual(author);
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should create and return new author when not found', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 2, name: 'New Author' } as Author;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.findOrCreate('New Author');

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Author' });
    });
  });

  describe('create', () => {
    it('should create a new author', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = { id: 1, name: 'New Author' } as Author;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({ name: 'New Author' });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({ name: 'New Author' });
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
    it('should update author name', async () => {
      const existing = { id: 1, name: 'Old' } as Author;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(null);
      const updated = { id: 1, name: 'New' } as Author;
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'New' });

      expect(result).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'New' });
    });

    it('should throw NotFoundException when author does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when new name is taken', async () => {
      const existing = { id: 1, name: 'Old' } as Author;
      const taken = { id: 2, name: 'Taken' } as Author;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(taken);
      await expect(service.update(1, { name: 'Taken' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete existing author', async () => {
      mockRepo.findOneById.mockResolvedValue({ id: 1 });
      mockRepo.delete.mockResolvedValue(true);
      await service.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when author does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
