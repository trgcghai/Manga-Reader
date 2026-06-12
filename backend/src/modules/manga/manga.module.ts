import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { AuthorModule } from 'src/modules/author/author.module';
import { GenreModule } from 'src/modules/genre/genre.module';

@Module({
  imports: [TypeOrmModule.forFeature([Manga]), AuthorModule, GenreModule],
  controllers: [MangaController],
  providers: [MangaService, MangaRepository],
  exports: [MangaRepository],
})
export class MangaModule {}
