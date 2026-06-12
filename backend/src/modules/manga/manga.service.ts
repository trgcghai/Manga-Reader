import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { CreateMangaDto } from 'src/modules/manga/dto/manga.dto';
import { AuthorRepository } from 'src/modules/manga/author.repository';
import { GenreRepository } from 'src/modules/manga/genre.repository';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';

@Injectable()
export class MangaService {
  constructor(
    private readonly mangaRepository: MangaRepository,
    private readonly authorRepository: AuthorRepository,
    private readonly genreRepo: GenreRepository,
  ) {}

  findAll = async (
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: Manga[]; total: number } | Manga[]> => {
    try {
      return await this.mangaRepository.findAll(page, limit);
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve mangas: ${error}`);
    }
  };

  findOne = async (id: number): Promise<Manga> => {
    try {
      const result = await this.mangaRepository.findOneById(id);
      if (!result) {
        throw new NotFoundException(`Manga with ID ${id} not found`);
      }
      return result;
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve manga: ${error}`);
    }
  };

  create = async (dto: CreateMangaDto): Promise<Manga> => {
    try {
      let authors: Author[] = [];
      if (dto.authors && dto.authors.length !== 0) {
        authors = await Promise.all(
          dto.authors.map(async (name) => {
            let author = await this.authorRepository.findOneByName(name);
            if (!author) {
              author = await this.authorRepository.create({ name });
            }
            return author;
          }),
        );
      }

      let genres: Genre[] = [];
      if (dto.genres && dto.genres.length !== 0) {
        genres = await Promise.all(
          dto.genres.map(async (name) => {
            let genre = await this.genreRepo.findOneByName(name);
            if (!genre) {
              genre = await this.genreRepo.create({ name });
            }
            return genre;
          }),
        );
      }

      const manga = await this.mangaRepository.create({
        title: dto.title,
        status: dto.status,
        description: dto.description,
        alternativeTitles: dto.alternativeTitles,
        coverPath: dto.coverPath,
        authors,
        genres,
      });

      return manga;
    } catch (error) {
      throw new BadRequestException(`Failed to create manga: ${error}`);
    }
  };
}
