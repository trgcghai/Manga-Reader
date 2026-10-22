import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslationRepository } from 'src/modules/manga/repositories/translation.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { FileService } from 'src/modules/file/file.service';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import { Language } from 'src/modules/language/entities/language.entity';
import { Translator } from 'src/modules/translator/entities/translator.entity';
import { ChapterRepository } from 'src/modules/manga/repositories/chapter.repository';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
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

  const mockFileService = {
    publicUrl: 'https://cdn.example.com/assets',
    bucket: 'manga-pages',
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockChapterRepo = {
    findAdjacent: jest.fn(),
  };

  const language = { id: 1, code: 'en', name: 'English' } as Language;
  const translator = { id: 1, name: 'Translator A' } as Translator;

  const translation = {
    id: 1,
    url: '/path',
    language,
    translator,
    chapter: { id: 5, manga: { id: 10 } },
  } as unknown as Translation;

  const dto: UpdateTranslationDto = {
    languageId: 2,
    url: '/new/path',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockFileService.delete.mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranslationService,
        { provide: TranslationRepository, useValue: mockTranslationRepo },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: TranslatorService, useValue: mockTranslatorService },
        { provide: FileService, useValue: mockFileService },
        { provide: ChapterRepository, useValue: mockChapterRepo },
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
        url: '/updated/path',
      });
      const dtoFolderOnly: UpdateTranslationDto = {
        url: '/updated/path',
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
        url: '/new/path',
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
        url: '/new/path',
      });
      expect(result).toEqual(updated);
    });

    it('should delete old file when url is changed to a storage URL', async () => {
      const withOldUrl = {
        ...translation,
        url: 'https://cdn.example.com/assets/manga-pages/old/file.cbz',
      };
      mockTranslationRepo.findById.mockResolvedValue(withOldUrl);
      mockLanguageService.findOne.mockResolvedValue(language);
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        null,
      );
      mockTranslationRepo.update.mockResolvedValue({
        ...withOldUrl,
        url: 'https://cdn.example.com/assets/manga-pages/new/file.cbz',
      });
      await service.update(10, 5, 1, {
        url: 'https://cdn.example.com/assets/manga-pages/new/file.cbz',
      });
      expect(mockFileService.delete).toHaveBeenCalledWith('old/file.cbz');
    });

    it('should not delete file when the old URL is outside the storage location', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        null,
      );
      mockTranslationRepo.update.mockResolvedValue({
        ...translation,
        url: '/new/path',
      });
      await service.update(10, 5, 1, dto);
      expect(mockFileService.delete).not.toHaveBeenCalled();
    });

    it('should not delete file when URL is not provided', async () => {
      const withUrl = {
        ...translation,
        url: 'https://cdn.example.com/assets/manga-pages/old/file.cbz',
      };
      mockTranslationRepo.findById.mockResolvedValue(withUrl);
      mockTranslationRepo.update.mockResolvedValue(withUrl);
      const dtoNoUrl = { languageId: 2 };
      mockLanguageService.findOne.mockResolvedValue({
        id: 2,
        code: 'fr',
        name: 'French',
      });
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        null,
      );
      await service.update(10, 5, 1, dtoNoUrl);
      expect(mockFileService.delete).not.toHaveBeenCalled();
    });

    it('should not delete file when new URL is the same as the existing URL', async () => {
      const sameUrl =
        'https://cdn.example.com/assets/manga-pages/same/file.cbz';
      const withSameUrl = {
        ...translation,
        url: sameUrl,
      };
      mockTranslationRepo.findById.mockResolvedValue(withSameUrl);
      mockTranslationRepo.update.mockResolvedValue(withSameUrl);

      await service.update(10, 5, 1, { url: sameUrl });

      expect(mockFileService.delete).not.toHaveBeenCalled();
    });

    it('should propagate file delete error during update', async () => {
      const withUrl = {
        ...translation,
        url: 'https://cdn.example.com/assets/manga-pages/old/file.cbz',
      };
      mockTranslationRepo.findById.mockResolvedValue(withUrl);
      mockLanguageService.findOne.mockResolvedValue({
        id: 2,
        code: 'fr',
        name: 'French',
      });
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        null,
      );
      mockFileService.delete.mockRejectedValue(new Error('Storage error'));
      await expect(
        service.update(10, 5, 1, { url: '/new/path' }),
      ).rejects.toThrow('Storage error');
    });
  });

  describe('findOne', () => {
    it('should return TranslationDetailResponse when translation exists', async () => {
      const found = {
        id: 1,
        url: '/path/to/file.cbz',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 1,
          title: 'Chapter 1',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      mockTranslationRepo.findById.mockResolvedValue(found);

      const result = await service.findOne(1);

      expect(mockTranslationRepo.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        url: '/path/to/file.cbz',
        note: 'v2',
        createdAt: '2026-01-01T00:00:00.000Z',
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 1,
          title: 'Chapter 1',
          manga: { id: 10, title: 'One Piece' },
        },
        prevTranslationId: null,
        nextTranslationId: null,
      });
    });

    it('should throw NotFoundException when translation does not exist', async () => {
      mockTranslationRepo.findById.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockTranslationRepo.findById).toHaveBeenCalledWith(999);
    });

    it('should set prevTranslationId and nextTranslationId to null when no adjacent chapters exist', async () => {
      const baseTranslation = {
        id: 1,
        url: '/path',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 3,
          title: 'Chapter 3',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent.mockResolvedValue(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBeNull();
      expect(result.nextTranslationId).toBeNull();
    });

    it('should find prevTranslationId with exact translator+language match', async () => {
      const baseTranslation = {
        id: 1,
        url: '/path',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 3,
          title: 'Chapter 3',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      const exactTranslation = {
        id: 100,
        translator: { id: 1 },
        language: { id: 1 },
      } as Translation;
      const chExact = {
        id: 4,
        translations: [exactTranslation],
      } as unknown as Chapter;

      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chExact)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(100);
      expect(result.nextTranslationId).toBeNull();
    });

    it('should fall back to same language match when no exact translator match for prev', async () => {
      const baseTranslation = {
        id: 1,
        url: '/path',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 3,
          title: 'Chapter 3',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      const langFallbackTranslation = {
        id: 101,
        translator: { id: 2 },
        language: { id: 1 },
      } as Translation;
      const chLangFallback = {
        id: 4,
        translations: [langFallbackTranslation],
      } as unknown as Chapter;

      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chLangFallback)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(101);
      expect(result.nextTranslationId).toBeNull();
    });

    it('should fall back to first translation when no language match for prev', async () => {
      const baseTranslation = {
        id: 1,
        url: '/path',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 3,
          title: 'Chapter 3',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      const anyTranslation = {
        id: 102,
        translator: { id: 2 },
        language: { id: 2 },
      } as Translation;
      const chAny = {
        id: 4,
        translations: [anyTranslation],
      } as unknown as Chapter;

      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chAny)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(102);
      expect(result.nextTranslationId).toBeNull();
    });

    it('should set prevTranslationId to null when prev chapter has no translations', async () => {
      const baseTranslation = {
        id: 1,
        url: '/path',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 3,
          title: 'Chapter 3',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      const chEmpty = { id: 4, translations: [] } as unknown as Chapter;

      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chEmpty)
        .mockResolvedValueOnce(null);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBeNull();
      expect(result.nextTranslationId).toBeNull();
    });

    it('should set both prevTranslationId and nextTranslationId when both exist with exact matches', async () => {
      const baseTranslation = {
        id: 1,
        url: '/path',
        note: 'v2',
        createdAt: new Date('2026-01-01'),
        language: { id: 1, code: 'en', name: 'English' },
        translator: { id: 1, name: 'Translator A' },
        chapter: {
          id: 5,
          number: 3,
          title: 'Chapter 3',
          manga: { id: 10, title: 'One Piece' },
        },
      } as unknown as Translation;
      const exactTranslation = {
        id: 100,
        translator: { id: 1 },
        language: { id: 1 },
      } as Translation;
      const chExact = {
        id: 4,
        translations: [exactTranslation],
      } as unknown as Chapter;

      mockTranslationRepo.findById.mockResolvedValue(baseTranslation);
      mockChapterRepo.findAdjacent
        .mockResolvedValueOnce(chExact)
        .mockResolvedValueOnce(chExact);

      const result = await service.findOne(1);

      expect(result.prevTranslationId).toBe(100);
      expect(result.nextTranslationId).toBe(100);
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

    it('should delete file when translation has a storage URL', async () => {
      const withUrl = {
        ...translation,
        url: 'https://cdn.example.com/assets/manga-pages/some/file.cbz',
      };
      mockTranslationRepo.findById.mockResolvedValue(withUrl);
      mockTranslationRepo.delete.mockResolvedValue(undefined);
      await service.delete(10, 5, 1);
      expect(mockFileService.delete).toHaveBeenCalledWith('some/file.cbz');
    });

    it('should not delete file when translation URL is outside storage', async () => {
      mockTranslationRepo.findById.mockResolvedValue(translation);
      mockTranslationRepo.delete.mockResolvedValue(undefined);
      await service.delete(10, 5, 1);
      expect(mockFileService.delete).not.toHaveBeenCalled();
    });

    it('should propagate file delete error during delete', async () => {
      const withUrl = {
        ...translation,
        url: 'https://cdn.example.com/assets/manga-pages/old/file.cbz',
      };
      mockTranslationRepo.findById.mockResolvedValue(withUrl);
      mockFileService.delete.mockRejectedValue(new Error('Storage error'));
      await expect(service.delete(10, 5, 1)).rejects.toThrow('Storage error');
    });

    it('should not attempt file delete when translation has no url', async () => {
      const noUrl = { ...translation, url: null };
      mockTranslationRepo.findById.mockResolvedValue(noUrl);
      mockTranslationRepo.delete.mockResolvedValue(undefined);
      await service.delete(10, 5, 1);
      expect(mockFileService.delete).not.toHaveBeenCalled();
    });
  });
});
