import { Test, TestingModule } from '@nestjs/testing';
import { AuthorController } from './author.controller';
import { AuthorService } from './author.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAuthorDto } from 'src/modules/manga/dto/create-author.dto';
import { UpdateAuthorDto } from 'src/modules/manga/dto/update-author.dto';

describe('AuthorController', () => {
  let controller: AuthorController;
  let service: jest.Mocked<AuthorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorController],
      providers: [
        {
          provide: AuthorService,
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

    controller = module.get<AuthorController>(AuthorController);
    service = module.get(AuthorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated authors', async () => {
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('search', '2', '10');

      expect(service.findAll).toHaveBeenCalledWith('search', 2, 10);
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('should return author by id', async () => {
      const author = { id: 1, name: 'Test' };
      service.findOne.mockResolvedValue(author);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(author);
    });

    it('should throw NotFoundException when author not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new author', async () => {
      const dto: CreateAuthorDto = { name: 'New Author' };
      const created = { id: 1, name: 'New Author' };
      service.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException on duplicate name', async () => {
      service.create.mockRejectedValue(new BadRequestException());

      await expect(controller.create({ name: 'Duplicate' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update and return the author', async () => {
      const dto: UpdateAuthorDto = { name: 'Updated' };
      const updated = { id: 1, name: 'Updated' };
      service.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when author not found', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', { name: 'Nope' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete author', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when author not found', async () => {
      service.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
