import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { MangaRepository } from 'src/modules/manga/repositories/manga.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { ChapterRepository } from 'src/modules/manga/repositories/chapter.repository';
import { TranslationRepository } from 'src/modules/manga/repositories/translation.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import type { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';
import { Language } from 'src/modules/language/entities/language.entity';
import { Translator } from 'src/modules/translator/entities/translator.entity';

describe('ChapterService', () => {
  let service: ChapterService;

  const mockMangaRepo = {
    findOneById: jest.fn(),
  };

  const mockLanguageService = {
    findOne: jest.fn(),
  };

  const mockTranslatorService = {
    findOne: jest.fn(),
  };

  const mockChapterRepo = {
    findByMangaAndNumber: jest.fn(),
    create: jest.fn(),
  };

  const mockTranslationRepo = {
    findByChapterAndLanguageAndTranslator: jest.fn(),
    create: jest.fn(),
  };

  const manga = {
    id: 1,
    title: 'Test Manga',
    chapters: [],
  } as unknown as Manga;

  const language = {
    id: 1,
    code: 'en',
    name: 'English',
  } as unknown as Language;

  const translator = {
    id: 1,
    name: 'Translator A',
  } as unknown as Translator;

  const chapter = {
    id: 1,
    number: 5,
    title: 'Ch 5',
    manga,
    translations: [],
  } as unknown as Chapter;

  const translation = {
    id: 1,
    chapter,
    language,
    translator,
    url: '/path',
  } as unknown as Translation;

  const dto: CreateChapterDto = {
    number: 5,
    title: 'Ch 5',
    languageId: 1,
    translatorId: 1,
    url: '/chapters/5',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChapterService,
        { provide: MangaRepository, useValue: mockMangaRepo },
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: TranslatorService, useValue: mockTranslatorService },
        { provide: ChapterRepository, useValue: mockChapterRepo },
        { provide: TranslationRepository, useValue: mockTranslationRepo },
      ],
    }).compile();

    service = module.get(ChapterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException when manga does not exist', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(null);
      await expect(service.create(999, dto)).rejects.toThrow(NotFoundException);
      expect(mockChapterRepo.create).not.toHaveBeenCalled();
      expect(mockTranslationRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when language does not exist', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      mockLanguageService.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.create(1, dto)).rejects.toThrow(NotFoundException);
      expect(mockChapterRepo.create).not.toHaveBeenCalled();
      expect(mockTranslationRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when translator does not exist', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      mockLanguageService.findOne.mockResolvedValue(language);
      mockTranslatorService.findOne.mockRejectedValue(new NotFoundException());
      await expect(service.create(1, dto)).rejects.toThrow(NotFoundException);
      expect(mockChapterRepo.create).not.toHaveBeenCalled();
      expect(mockTranslationRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when translation already exists', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      mockLanguageService.findOne.mockResolvedValue(language);
      mockTranslatorService.findOne.mockResolvedValue(translator);
      mockChapterRepo.findByMangaAndNumber.mockResolvedValue(chapter);
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        translation,
      );
      await expect(service.create(1, dto)).rejects.toThrow(ConflictException);
      expect(mockChapterRepo.create).not.toHaveBeenCalled();
      expect(mockTranslationRepo.create).not.toHaveBeenCalled();
    });

    it('should create only Translation when Chapter already exists', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      mockLanguageService.findOne.mockResolvedValue(language);
      mockTranslatorService.findOne.mockResolvedValue(translator);
      mockChapterRepo.findByMangaAndNumber.mockResolvedValue(chapter);
      mockTranslationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
        null,
      );
      mockTranslationRepo.create.mockResolvedValue(translation);
      const result = await service.create(1, dto);
      expect(mockChapterRepo.create).not.toHaveBeenCalled();
      expect(mockTranslationRepo.create).toHaveBeenCalledWith({
        chapter,
        language,
        translator,
        url: dto.url,
      });
      expect(result).toEqual(chapter);
    });

    it('should create both Chapter and Translation when Chapter is new', async () => {
      mockMangaRepo.findOneById.mockResolvedValue(manga);
      mockLanguageService.findOne.mockResolvedValue(language);
      mockTranslatorService.findOne.mockResolvedValue(translator);
      mockChapterRepo.findByMangaAndNumber.mockResolvedValue(null);
      mockChapterRepo.create.mockResolvedValue(chapter);
      mockTranslationRepo.create.mockResolvedValue(translation);
      const result = await service.create(1, dto);
      expect(mockChapterRepo.create).toHaveBeenCalledWith({
        manga,
        number: dto.number,
        title: dto.title,
      });
      expect(mockTranslationRepo.create).toHaveBeenCalledWith({
        chapter,
        language,
        translator,
        url: dto.url,
      });
      expect(result).toEqual(chapter);
    });
  });
});
