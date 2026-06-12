import { Module } from '@nestjs/common';
import { MangaService } from './manga.service';
import { MangaController } from './manga.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { GenreRepository } from 'src/modules/manga/genre.repository';
import { AuthorRepository } from 'src/modules/manga/author.repository';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Manga, Author, Genre])],
  controllers: [MangaController, AuthorController],
  providers: [
    MangaService,
    MangaRepository,
    AuthorRepository,
    GenreRepository,
    AuthorService,
  ],
  exports: [MangaRepository, AuthorRepository, GenreRepository],
})
export class MangaModule {}
