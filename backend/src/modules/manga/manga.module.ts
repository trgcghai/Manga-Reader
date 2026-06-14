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

@Module({
  imports: [TypeOrmModule.forFeature([Manga, Chapter, Translation]), AuthorModule, GenreModule],
  controllers: [MangaController],
  providers: [MangaService, MangaRepository, ImportMangaService],
  exports: [MangaRepository],
})
export class MangaModule {}
