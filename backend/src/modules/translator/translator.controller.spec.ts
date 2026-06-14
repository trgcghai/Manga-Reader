import { Test, TestingModule } from '@nestjs/testing';
import { TranslatorController } from './translator.controller';
import { TranslatorService } from './translator.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CreateTranslatorDto,
  UpdateTranslatorDto,
} from 'src/modules/translator/dto/translator.dto';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('TranslatorController', () => {
  let controller: TranslatorController;
  let service: jest.Mocked<TranslatorService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranslatorController],
      providers: [
        {
          provide: TranslatorService,
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

    controller = module.get<TranslatorController>(TranslatorController);
    service = module.get(TranslatorService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated translators', async () => {
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
    it('should return translator by id', async () => {
      const translator = { id: 1, name: 'Test' } as unknown as Translator;
      service.findOne.mockResolvedValue(translator);

      const result = await controller.findOne('1');

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(translator);
    });

    it('should throw NotFoundException when translator not found', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new translator', async () => {
      const dto: CreateTranslatorDto = { name: 'New Translator', note: 'Note' };
      const created = { id: 1, name: 'New Translator', note: 'Note' } as unknown as Translator;
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
    it('should update and return the translator', async () => {
      const dto: UpdateTranslatorDto = { name: 'Updated', note: 'Updated note' };
      const updated = { id: 1, name: 'Updated', note: 'Updated note' } as unknown as Translator;
      service.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when translator not found', async () => {
      service.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update('999', { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete translator', async () => {
      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete('1');

      expect(service.delete).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when translator not found', async () => {
      service.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('999')).rejects.toThrow(NotFoundException);
    });
  });
});
