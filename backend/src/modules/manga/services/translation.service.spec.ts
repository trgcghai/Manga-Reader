import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslationRepository } from 'src/modules/manga/repositories/translation.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import { Language } from 'src/modules/language/entities/language.entity';
import { Translator } from 'src/modules/translator/entities/translator.entity';
import type { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto';

describe('TranslationService', () => {
  let service: TranslationService;

  const mockTranslationRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByChapterAndLanguageAndTranslator: jest.fn(),
  };

  const mockLanguageService = {
    findOne: jest.fn(),
  };

  const mockTranslatorService = {
    findOne: jest.fn(),
  };

  const language = { id: 1, code: 'en', name: 'English' } as Language;
  const translator = { id: 1, name: 'Translator A' } as Translator;

  const translation = {
    id: 1,
    folderPath: '/path',
    language,
    translator,
    chapter: { id: 5, manga: { id: 10 } },
  } as unknown as Translation;

  const dto: UpdateTranslationDto = {
    languageId: 2,
    folderPath: '/new/path',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: TranslationRepository, useValue: mockTranslationRepo },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: TranslatorService, useValue: mockTranslatorService },
      ],
    }).compile();

    service = module.get(TranslationService);
  });

  describe('update', () => {
    it('should throw NotFoundException when translation does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(null);
      await expect(service.update(10, 5, 999, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when chapterId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      await expect(service.update(10, 99, 1, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when mangaId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      await expect(service.update(99, 5, 1, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when language does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockLanguageService.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.update(10, 5, 1, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when translator does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockLanguageService.findOne.mockResolvedValue(language);
      const dtoWithTranslator: UpdateTranslationDto = { translatorId: 99 };
      mockTranslatorService.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.update(10, 5, 1, dtoWithTranslator)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when duplicate language+translator exists', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockLanguageService.findOne.mockResolvedValue(language);
      mockTranslatorService.findOne.mockResolvedValue(translator);
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        { id: 2 },
      );
      await expect(service.update(10, 5, 1, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should skip conflict check when language and translator are unchanged', async () => {
      mockTranslationRepo.findById.mockResolvedValue({
        ...translation,
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'T1' },
      });
      mockTranslationRepo.update.mockResolvedValue({
        ...translation,
        folderPath: '/updated/path',
      });
      const dtoFolderOnly: UpdateTranslationDto = {
        folderPath: '/updated/path',
      };
      const result = await service.update(10, 5, 1, dtoFolderOnly);
      expect(
        mockTranslationRepo.findByChapterAndLanguageAndTranslator,
      ).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update and return translation when all validations pass', async () => {
      const newLang = { id: 2, code: 'fr', name: 'French' } as Language;
      const updated = {
        ...translation,
        folderPath: '/new/path',
        language: newLang,
      };
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockLanguageService.findOne.mockResolvedValue(newLang);
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        null,
      );
      mockTranslationRepo.update.mockResolvedValue(updated);
      const result = await service.update(10, 5, 1, dto);
      expect(mockTranslationRepo.update).toHaveBeenCalledWith(1, {
        language: newLang,
        folderPath: '/new/path',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when translation does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(null);
      await expect(service.delete(10, 5, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when chapterId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      await expect(service.delete(10, 99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when mangaId does not match', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      await expect(service.delete(99, 5, 1)).rejects.toThrow(NotFoundException);
    });

    it('should delete when translation exists and ownership matches', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockTranslationRepo.delete.mockResolvedValue(undefined);
      await service.delete(10, 5, 1);
      expect(mockTranslationRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
