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
        folderPath: dto.folderPath,
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
      folderPath: dto.folderPath,
    });

    return chapter;
  };
}
