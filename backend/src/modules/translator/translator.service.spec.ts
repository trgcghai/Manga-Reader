import { Test, TestingModule } from '@nestjs/testing';
import { TranslatorService } from './translator.service';
import { TranslatorRepository } from './translator.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('TranslatorService', () => {
  let service: TranslatorService;
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
        TranslatorService,
        { provide: TranslatorRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(TranslatorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
      mockRepo.findAll.mockResolvedValue(expected);
      expect(await service.findAll('search', 2, 10)).toEqual(expected);
      expect(mockRepo.findAll).toHaveBeenCalledWith('search', 2, 10);
    });
  });

  describe('findOne', () => {
    it('should return translator when found', async () => {
      const translator = { id: 1, name: 'Test' } as Translator;
      mockRepo.findOneById.mockResolvedValue(translator);
      expect(await service.findOne(1)).toEqual(translator);
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new translator', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = {
        id: 1,
        name: 'New Translator',
        note: 'A note',
      } as Translator;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({
        name: 'New Translator',
        note: 'A note',
      });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'New Translator',
        note: 'A note',
      });
    });

    it('should create with null note when note not provided', async () => {
      mockRepo.findOneByName.mockResolvedValue(null);
      const saved = {
        id: 1,
        name: 'New Translator',
        note: null,
      } as unknown as Translator;
      mockRepo.create.mockResolvedValue(saved);

      const result = await service.create({ name: 'New Translator' });

      expect(result).toEqual(saved);
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: 'New Translator',
        note: undefined,
      });
    });

    it('should throw BadRequestException on duplicate name', async () => {
      mockRepo.findOneByName.mockResolvedValue({ id: 1, name: 'Existing' });
      await expect(service.create({ name: 'Existing' })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update translator name and note', async () => {
      const existing = { id: 1, name: 'Old', note: 'Old note' } as Translator;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(null);
      const updated = { id: 1, name: 'New', note: 'New note' } as Translator;
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'New', note: 'New note' });

      expect(result).toEqual(updated);
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        name: 'New',
        note: 'New note',
      });
    });

    it('should throw NotFoundException when translator does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.update(999, { name: 'Nope' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when new name is taken', async () => {
      const existing = { id: 1, name: 'Old' } as Translator;
      const taken = { id: 2, name: 'Taken' } as Translator;
      mockRepo.findOneById.mockResolvedValue(existing);
      mockRepo.findOneByName.mockResolvedValue(taken);
      await expect(service.update(1, { name: 'Taken' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete existing translator', async () => {
      mockRepo.findOneById.mockResolvedValue({ id: 1 });
      mockRepo.delete.mockResolvedValue(true);
      await service.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when translator does not exist', async () => {
      mockRepo.findOneById.mockResolvedValue(null);
      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });
  });
});
