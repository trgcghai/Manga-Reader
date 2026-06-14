import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChapterService } from './chapter.service';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { ChapterRepository } from 'src/modules/manga/chapter.repository';
import { TranslationRepository } from 'src/modules/manga/translation.repository';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import type { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';

describe('ChapterService', () => {
  let service: ChapterService;
  let mangaRepo: jest.Mocked<MangaRepository>;
  let languageService: jest.Mocked<LanguageService>;
  let translatorService: jest.Mocked<TranslatorService>;
  let chapterRepo: jest.Mocked<ChapterRepository>;
  let translationRepo: jest.Mocked<TranslationRepository>;

  const manga = {
    id: 1,
    title: 'Test Manga',
    chapters: [],
  } as unknown as Manga;

  const language = { id: 1, code: 'en', name: 'English' } as any;
  const translator = { id: 1, name: 'Translator A' } as any;

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
    folderPath: '/path',
  } as unknown as Translation;

  const dto: CreateChapterDto = {
    number: 5,
    title: 'Ch 5',
    releaseDate: '2024-01-15',
    note: 'Side story',
    languageId: 1,
    translatorId: 1,
    folderPath: '/chapters/5',
  };

  beforeEach(() => {
    mangaRepo = { findOneById: jest.fn() } as any;
    languageService = { findOne: jest.fn() } as any;
    translatorService = { findOne: jest.fn() } as any;
    chapterRepo = {
      findByMangaAndNumber: jest.fn(),
      create: jest.fn(),
    } as any;
    translationRepo = {
      findByChapterAndLanguageAndTranslator: jest.fn(),
      create: jest.fn(),
    } as any;

    service = new ChapterService(
      mangaRepo,
      languageService,
      translatorService,
      chapterRepo,
      translationRepo,
    );
  });

  it('should throw NotFoundException when manga does not exist', async () => {
    mangaRepo.findOneById.mockResolvedValue(null);
    await expect(service.create(999, dto)).rejects.toThrow(NotFoundException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when language does not exist', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockRejectedValue(new NotFoundException());
    await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when translator does not exist', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockRejectedValue(new NotFoundException());
    await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictException when translation already exists', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(chapter);
    translationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
      translation,
    );
    await expect(service.create(1, dto)).rejects.toThrow(ConflictException);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).not.toHaveBeenCalled();
  });

  it('should create only Translation when Chapter already exists', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(chapter);
    translationRepo.findByChapterAndLanguageAndTranslator.mockResolvedValue(
      null,
    );
    translationRepo.create.mockResolvedValue(translation);
    const result = await service.create(1, dto);
    expect(chapterRepo.create).not.toHaveBeenCalled();
    expect(translationRepo.create).toHaveBeenCalledWith({
      chapter,
      language,
      translator,
      folderPath: dto.folderPath,
    });
    expect(result).toEqual(chapter);
  });

  it('should create both Chapter and Translation when Chapter is new', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(null);
    chapterRepo.create.mockResolvedValue(chapter);
    translationRepo.create.mockResolvedValue(translation);
    const result = await service.create(1, dto);
    expect(chapterRepo.create).toHaveBeenCalledWith({
      manga,
      number: dto.number,
      title: dto.title,
      releaseDate: new Date(dto.releaseDate as string),
      note: dto.note ?? null,
    });
    expect(translationRepo.create).toHaveBeenCalledWith({
      chapter,
      language,
      translator,
      folderPath: dto.folderPath,
    });
    expect(result).toEqual(chapter);
  });

  it('should handle undefined releaseDate', async () => {
    mangaRepo.findOneById.mockResolvedValue(manga);
    languageService.findOne.mockResolvedValue(language);
    translatorService.findOne.mockResolvedValue(translator);
    chapterRepo.findByMangaAndNumber.mockResolvedValue(null);
    chapterRepo.create.mockResolvedValue(chapter);
    translationRepo.create.mockResolvedValue(translation);

    const dtoWithoutDate = { ...dto, releaseDate: undefined };
    await service.create(1, dtoWithoutDate);

    expect(chapterRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ releaseDate: null }),
    );
  });
});
