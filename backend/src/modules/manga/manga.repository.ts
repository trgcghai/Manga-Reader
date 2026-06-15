import { InjectRepository } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Repository } from 'typeorm';

export class MangaRepository {
  constructor(
    @InjectRepository(Manga)
    private readonly repo: Repository<Manga>,
  ) {}

  findAll = async (
    page: number,
    limit: number,
  ): Promise<{
    data: Manga[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const [data, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['authors', 'genres'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  };

  findOneById = async (id: number): Promise<Manga | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  create = async (data: Partial<Manga>): Promise<Manga> => {
    return await this.repo.save(data);
  };

  findOneByIdWithRelations = async (
    id: number,
    includeDetail?: boolean,
  ): Promise<Manga | null> => {
    const relations: string[] = ['authors', 'genres'];
    if (includeDetail) {
      relations.push('chapters', 'chapters.translations');
    }
    return await this.repo.findOne({
      where: { id },
      relations,
    });
  };

  update = async (id: number, data: Partial<Manga>): Promise<Manga | null> => {
    const manga = await this.repo.findOne({
      where: { id },
      relations: ['authors', 'genres'],
    });
    if (!manga) return null;

    if (data.title !== undefined) manga.title = data.title;
    if (data.status !== undefined) manga.status = data.status;
    if (data.description !== undefined) manga.description = data.description;
    if (data.alternativeTitles !== undefined)
      manga.alternativeTitles = data.alternativeTitles;
    if (data.coverPath !== undefined) manga.coverPath = data.coverPath;
    if (data.authors !== undefined) manga.authors = data.authors;
    if (data.genres !== undefined) manga.genres = data.genres;

    return await this.repo.save(manga);
  };

  delete = async (id: number): Promise<boolean> => {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
