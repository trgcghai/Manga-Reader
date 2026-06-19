import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TranslationRepository } from 'src/modules/manga/repositories/translation.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { FileService } from 'src/modules/file/file.service';
import { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto';
import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';

@Injectable()
export class TranslationService {
  constructor(
    private readonly translationRepo: TranslationRepository,
    private readonly languageService: LanguageService,
    private readonly translatorService: TranslatorService,
    private readonly fileService: FileService,
  ) {}

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
    if (dto.url !== undefined) {
      partial.url = dto.url;
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

    if (dto.url !== undefined && translation.url) {
      const key = extractKeyFromUrl(
        translation.url,
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

    if (translation.url) {
      const key = extractKeyFromUrl(
        translation.url,
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
