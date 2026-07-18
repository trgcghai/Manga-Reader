import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TranslationRepository } from 'src/modules/manga/repositories/translation.repository';
import { ChapterRepository } from 'src/modules/manga/repositories/chapter.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { FileService } from 'src/modules/file/file.service';
import {
  TranslationDetailResponse,
  UpdateTranslationDto,
} from 'src/modules/manga/dto/translation.dto';
import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';

@Injectable()
export class TranslationService {
  constructor(
    private readonly translationRepo: TranslationRepository,
    private readonly chapterRepo: ChapterRepository,
    private readonly languageService: LanguageService,
    private readonly translatorService: TranslatorService,
    private readonly fileService: FileService,
  ) {}

  findOne = async (
    translationId: number,
  ): Promise<TranslationDetailResponse> => {
    const translation = await this.translationRepo.findById(translationId);
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    const { manga, number: chapterNumber } = translation.chapter;
    const translatorId = translation.translator.id;
    const languageId = translation.language.id;

    const resolveAdjacent = async (
      direction: 'prev' | 'next',
    ): Promise<number | null> => {
      const adjacent = await this.chapterRepo.findAdjacent(
        manga.id,
        chapterNumber,
        direction,
      );
      if (!adjacent) return null;
      if (!adjacent.translations || adjacent.translations.length === 0) {
        return null;
      }

      const exact = adjacent.translations.find(
        (t) => t.translator.id === translatorId && t.language.id === languageId,
      );
      if (exact) return exact.id;

      const langMatch = adjacent.translations.find(
        (t) => t.language.id === languageId,
      );
      if (langMatch) return langMatch.id;

      return adjacent.translations[0].id;
    };

    const [prevTranslationId, nextTranslationId] = await Promise.all([
      resolveAdjacent('prev'),
      resolveAdjacent('next'),
    ]);

    return {
      id: translation.id,
      key: translation.key,
      note: translation.note ?? undefined,
      createdAt: translation.createdAt.toISOString(),
      language: translation.language,
      translator: translation.translator,
      chapter: {
        id: translation.chapter.id,
        number: translation.chapter.number,
        title: translation.chapter.title ?? undefined,
        manga: {
          id: translation.chapter.manga.id,
          title: translation.chapter.manga.title,
        },
      },
      prevTranslationId,
      nextTranslationId,
    };
  };

  update = async (
    mangaId: number,
    chapterId: number,
    translationId: number,
    dto: UpdateTranslationDto,
  ) => {
    const translation = await this.translationRepo.findById(translationId);
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    if (translation.chapter.id !== chapterId) {
      throw new NotFoundException('Translation not found');
    }
    if (translation.chapter.manga.id !== mangaId) {
      throw new NotFoundException('Translation not found');
    }

    const partial: Record<string, unknown> = {};

    if (dto.languageId !== undefined) {
      const language = await this.languageService.findOne(dto.languageId);
      partial.language = language;
    }
    if (dto.translatorId !== undefined) {
      const translator = await this.translatorService.findOne(dto.translatorId);
      partial.translator = translator;
    }
    if (dto.key !== undefined) {
      partial.key = dto.key;
    }

    if (dto.languageId !== undefined || dto.translatorId !== undefined) {
      const newLangId = dto.languageId ?? translation.language.id;
      const newTransId = dto.translatorId ?? translation.translator.id;
      const existing =
        await this.translationRepo.findByChapterAndLanguageAndTranslator(
          chapterId,
          newLangId,
          newTransId,
        );
      if (existing && existing.id !== translationId) {
        throw new ConflictException(
          'A translation with this language and translator already exists for this chapter',
        );
      }
    }

    if (
      dto.key !== undefined &&
      translation.key &&
      translation.key !== dto.key
    ) {
      const key = extractKeyFromUrl(
        translation.key,
        this.fileService.endpoint,
        this.fileService.bucket,
      );
      if (key) {
        await this.fileService.delete(key);
      }
    }

    const result = await this.translationRepo.update(translationId, partial);
    if (!result) {
      throw new NotFoundException('Translation not found');
    }
    return result;
  };

  delete = async (
    mangaId: number,
    chapterId: number,
    translationId: number,
  ) => {
    const translation = await this.translationRepo.findById(translationId);
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    if (translation.chapter.id !== chapterId) {
      throw new NotFoundException('Translation not found');
    }
    if (translation.chapter.manga.id !== mangaId) {
      throw new NotFoundException('Translation not found');
    }

    if (translation.key) {
      const key = extractKeyFromUrl(
        translation.key,
        this.fileService.endpoint,
        this.fileService.bucket,
      );
      if (key) {
        await this.fileService.delete(key);
      }
    }

    await this.translationRepo.delete(translationId);
  };
}
