import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Manga, Author, Genre])],
  controllers: [MangaController],
  providers: [MangaService, MangaRepository],
  exports: [MangaRepository],
})
export class MangaModule {}
