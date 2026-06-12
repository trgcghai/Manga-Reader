import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { GenreRepository } from 'src/modules/manga/genre.repository';
import { AuthorModule } from 'src/modules/author/author.module';

@Module({
  imports: [TypeOrmModule.forFeature([Manga, Genre]), AuthorModule],
  controllers: [MangaController],
  providers: [MangaService, MangaRepository, GenreRepository],
  exports: [MangaRepository, GenreRepository],
})
export class MangaModule {}
