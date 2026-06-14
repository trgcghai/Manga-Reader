import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Chapter } from './entities/chapter.entity';
import { Translation } from './entities/translation.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { AuthorModule } from 'src/modules/author/author.module';
import { GenreModule } from 'src/modules/genre/genre.module';
import { ImportMangaService } from './services/import-manga.service';
import { ChapterService } from './services/chapter.service';
import { ChapterRepository } from './chapter.repository';
import { TranslationRepository } from './translation.repository';
import { LanguageModule } from 'src/modules/language/language.module';
import { TranslatorModule } from 'src/modules/translator/translator.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Manga, Chapter, Translation]),
    AuthorModule,
    GenreModule,
    LanguageModule,
    TranslatorModule,
  ],
  controllers: [MangaController],
  providers: [
    MangaService,
    MangaRepository,
    ImportMangaService,
    ChapterService,
    ChapterRepository,
    TranslationRepository,
  ],
  exports: [MangaRepository],
})
export class MangaModule {}
