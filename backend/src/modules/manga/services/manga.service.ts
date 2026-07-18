import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/repositories/manga.repository';
import {
  CreateMangaDto,
  UpdateMangaDto,
} from 'src/modules/manga/dto/manga.dto';
import {
  MangaResponse,
  MangaDetailResponse,
} from 'src/modules/manga/dto/manga.dto';
import { AuthorService } from 'src/modules/author/author.service';
import { GenreService } from 'src/modules/genre/genre.service';
import { Author } from 'src/modules/author/entities/author.entity';
import { Genre } from 'src/modules/genre/entities/genre.entity';
import { FileService } from 'src/modules/file/file.service';
import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';
import { Logger } from '@nestjs/common';

@Injectable()
export class MangaService {
  private readonly logger = new Logger(MangaService.name);

  constructor(
    private readonly mangaRepository: MangaRepository,
    private readonly authorService: AuthorService,
    private readonly genreService: GenreService,
    private readonly fileService: FileService,
  ) {}

  findAll = async (
    page: number = 1,
    limit: number = 20,
    search?: string,
    status?: string,
  ): Promise<{
    data: Manga[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    return await this.mangaRepository.findAll(page, limit, search, status);
  };

  findOne = async (
    id: number,
    include?: string,
  ): Promise<MangaResponse | MangaDetailResponse | null> => {
    const included = include?.split(',').map((s) => s.trim()) ?? [];
    const includeDetail =
      included.includes('chapters') && included.includes('translations');
    const manga = await this.mangaRepository.findOneByIdWithRelations(
      id,
      includeDetail,
    );

    if (!manga) {
      if (includeDetail) {
        return null;
      }
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }

    const base: MangaResponse = {
      id: manga.id,
      title: manga.title,
      alternativeTitles: manga.alternativeTitles ?? undefined,
      description: manga.description ?? undefined,
      coverKey: manga.coverKey ?? undefined,
      status: manga.status,
      authors: manga.authors.map((a) => ({ id: a.id, name: a.name })),
      genres: manga.genres.map((g) => ({ id: g.id, name: g.name })),
      createdAt: manga.createdAt.toISOString(),
      updatedAt: manga.updatedAt.toISOString(),
    };

    if (!includeDetail) {
      return base;
    }

    return {
      ...base,
      chapters:
        (manga.chapters ?? [])
          .sort((a, b) => a.number - b.number)
          .map((ch) => ({
            id: ch.id,
            number: ch.number,
            title: ch.title ?? undefined,
            releaseDate: ch.releaseDate
              ? new Date(ch.releaseDate).toISOString().split('T')[0]
              : undefined,
            note: ch.note ?? undefined,
            translations:
              ch.translations?.map((tr) => ({
                id: tr.id,
                key: tr.key,
                note: tr.note ?? undefined,
                createdAt: tr.createdAt.toISOString(),
                language: {
                  id: tr.language.id,
                  code: tr.language.code,
                  name: tr.language.name,
                },
                translator: {
                  id: tr.translator.id,
                  name: tr.translator.name,
                },
              })) ?? [],
          })) ?? [],
    };
  };

  create = async (dto: CreateMangaDto): Promise<Manga> => {
    try {
      let authors: Author[] = [];
      if (dto.authors && dto.authors.length !== 0) {
        authors = await Promise.all(
          dto.authors.map(async (name) => {
            return await this.authorService.findOrCreate(name);
          }),
        );
      }

      let genres: Genre[] = [];
      if (dto.genres && dto.genres.length !== 0) {
        genres = await Promise.all(
          dto.genres.map(async (name) => {
            return await this.genreService.findOrCreate(name);
          }),
        );
      }

      const manga = await this.mangaRepository.create({
        title: dto.title,
        status: dto.status,
        description: dto.description,
        alternativeTitles: [...(dto.alternativeTitles || []), dto.title],
        coverKey: dto.coverKey,
        authors,
        genres,
      });

      return manga;
    } catch (error) {
      throw new BadRequestException(`Failed to create manga: ${error}`);
    }
  };

  update = async (id: number, dto: UpdateMangaDto): Promise<Manga> => {
    try {
      const existing = await this.mangaRepository.findOneByIdWithRelations(id);
      if (!existing) {
        throw new NotFoundException(`Manga with ID ${id} not found`);
      }

      const updateData: Partial<Manga> = {};

      if (dto.title) updateData.title = dto.title;
      if (dto.status) updateData.status = dto.status;
      if (dto.description) updateData.description = dto.description;
      if (dto.alternativeTitles)
        updateData.alternativeTitles = dto.alternativeTitles;
      if (dto.coverKey !== undefined) {
        if (existing.coverKey && existing.coverKey !== dto.coverKey) {
          const key = extractKeyFromUrl(
            existing.coverKey,
            this.fileService.endpoint,
            this.fileService.bucket,
          );
          if (key) {
            await this.fileService.delete(key);
          }
        }
        updateData.coverKey = dto.coverKey;
      }

      if (dto.authors) {
        const authors = await Promise.all(
          dto.authors.map(async (name) => {
            return await this.authorService.findOrCreate(name);
          }),
        );
        updateData.authors = authors;
      }

      if (dto.genres) {
        const genres = await Promise.all(
          dto.genres.map(async (name) => {
            return await this.genreService.findOrCreate(name);
          }),
        );
        updateData.genres = genres;
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('No updatable fields provided');
      }

      const updated = await this.mangaRepository.update(id, updateData);
      if (!updated) {
        throw new NotFoundException(`Manga with ID ${id} not found`);
      }
      return updated;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(`Failed to update manga: ${error}`);
    }
  };

  delete = async (id: number): Promise<void> => {
    try {
      const existing = await this.mangaRepository.findOneById(id);
      if (!existing) {
        throw new NotFoundException(`Manga with ID ${id} not found`);
      }

      if (existing.coverKey) {
        const key = extractKeyFromUrl(
          existing.coverKey,
          this.fileService.endpoint,
          this.fileService.bucket,
        );
        if (key) {
          await this.fileService.delete(key);
        }
      }

      await this.mangaRepository.delete(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete manga: ${error}`);
    }
  };
}
