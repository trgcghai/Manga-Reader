import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TranslationRepository } from 'src/modules/manga/translation.repository';
import { LanguageService } from 'src/modules/language/language.service';
import { TranslatorService } from 'src/modules/translator/translator.service';
import { UpdateTranslationDto } from 'src/modules/manga/dto/translation.dto';

@Injectable()
export class TranslationService {
  constructor(
    private readonly translationRepo: TranslationRepository,
    private readonly languageService: LanguageService,
    private readonly translatorService: TranslatorService,
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
    if (dto.folderPath !== undefined) {
      partial.folderPath = dto.folderPath;
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

    await this.translationRepo.delete(translationId);
  };
}
