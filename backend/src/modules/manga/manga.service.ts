import { Injectable, NotFoundException } from '@nestjs/common';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';
import { CreateMangaDto } from 'src/modules/manga/dto/create-manga.dto';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MangaService {
  constructor(
    private readonly mangaRepository: MangaRepository,
    @InjectRepository(Author)
    private readonly authorRepo: Repository<Author>,
    @InjectRepository(Genre)
    private readonly genreRepo: Repository<Genre>,
  ) {}

  findAll = async (
    page?: number,
    limit?: number,
  ): Promise<{ data: Manga[]; total: number } | Manga[]> => {
    if (page && limit) {
      return await this.mangaRepository.findAllPaginated(page, limit);
    }
    return await this.mangaRepository.findAll();
  };

  findOne = async (id: number): Promise<Manga> => {
    const result = await this.mangaRepository.findOneById(id);
    if (!result) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }
    return result;
  };

  create = async (dto: CreateMangaDto): Promise<Manga> => {
    const authors = await Promise.all(
      (dto.authors ?? []).map(async (name) => {
        let author = await this.authorRepo.findOne({ where: { name } });
        if (!author) {
          author = this.authorRepo.create({ name });
          author = await this.authorRepo.save(author);
        }
        return author;
      }),
    );

    const genres = await Promise.all(
      (dto.genres ?? []).map(async (name) => {
        let genre = await this.genreRepo.findOne({ where: { name } });
        if (!genre) {
          genre = this.genreRepo.create({ name });
          genre = await this.genreRepo.save(genre);
        }
        return genre;
      }),
    );

    const manga = await this.mangaRepository.create({
      title: dto.title,
      status: dto.status,
      description: dto.description,
      alternativeTitles: dto.alternativeTitles,
      coverPath: dto.coverPath,
      authors,
      genres,
    });

    return await this.mangaRepository.findOneById(manga.id);
  };
}
