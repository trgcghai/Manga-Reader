import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MangaRepository } from 'src/modules/manga/repositories/manga.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { ChapterRepository } from 'src/modules/manga/repositories/chapter.repository';
import { TranslationRepository } from 'src/modules/manga/repositories/translation.repository';
import { CreateChapterDto } from 'src/modules/manga/dto/chapter.dto';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import { ReaderChapterItem } from 'src/modules/manga/dto/translation.dto';

@Injectable()
export class ChapterService {
  constructor(
    private readonly mangaRepo: MangaRepository,
    private readonly languageService: LanguageService,
    private readonly translatorService: TranslatorService,
    private readonly chapterRepo: ChapterRepository,
    private readonly translationRepo: TranslationRepository,
  ) {}

  create = async (mangaId: number, dto: CreateChapterDto) => {
    const manga = await this.mangaRepo.findOneById(mangaId);
    if (!manga) {
      throw new NotFoundException('Manga #' + mangaId + ' not found');
    }

    const language = await this.languageService.findOne(dto.languageId);

    const translator = await this.translatorService.findOne(dto.translatorId);

    const existingChapter = await this.chapterRepo.findByMangaAndNumber(
      mangaId,
      dto.number,
    );

    if (existingChapter) {
      const existingTranslation =
        await this.translationRepo.findByChapterAndLanguageAndTranslator(
          existingChapter.id,
          dto.languageId,
          dto.translatorId,
        );

      if (existingTranslation) {
        throw new ConflictException(
          'A translation for chapter #' +
            dto.number +
            ' with this language and translator already exists',
        );
      }

      await this.translationRepo.create({
        chapter: existingChapter,
        language,
        translator,
        url: dto.url,
      });

      return existingChapter;
    }

    const chapter = await this.chapterRepo.create({
      manga,
      number: dto.number,
      title: dto.title,
    });

    await this.translationRepo.create({
      chapter,
      language,
      translator,
      url: dto.url,
    });

    return chapter;
  };

  private static findBestTranslationId(
    translations: Translation[],
    translatorId: number,
    languageCode: string,
  ): number | null {
    const exact = translations.find(
      (t) =>
        t.translator.id === translatorId && t.language.code === languageCode,
    );
    if (exact) return exact.id;

    const langMatch = translations.find(
      (t) => t.language.code === languageCode,
    );
    if (langMatch) return langMatch.id;

    return null;
  }

  getChapterList = async (
    mangaId: number,
    translatorId: number,
    language: string,
  ): Promise<ReaderChapterItem[]> => {
    const manga = await this.mangaRepo.findOneById(mangaId);
    if (!manga) {
      throw new NotFoundException('Manga #' + mangaId + ' not found');
    }

    const chapters = await this.chapterRepo.findAllByMangaId(mangaId);
    const lastIndex = chapters.length - 1;

    return chapters.map((chapter, index) => ({
      chapterId: chapter.id,
      title: chapter.title ?? null,
      translationId: ChapterService.findBestTranslationId(
        chapter.translations ?? [],
        translatorId,
        language,
      ),
      isFirstChapter: index === 0,
      isLatestChapter: index === lastIndex,
    }));
  };
}
