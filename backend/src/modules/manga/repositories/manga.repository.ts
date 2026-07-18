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
    search?: string,
    status?: string,
    authors?: string[],
    genres?: string[],
  ): Promise<{
    data: Manga[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const query = this.repo
      .createQueryBuilder('manga')
      .leftJoinAndSelect('manga.authors', 'author')
      .leftJoinAndSelect('manga.genres', 'genre');

    if (search) {
      query.andWhere(
        `(LOWER(manga.title) LIKE LOWER(:search)
          OR LOWER(manga.description) LIKE LOWER(:search)
          OR LOWER(COALESCE(ARRAY_TO_STRING(manga.alternativeTitles, ' '), '')) LIKE LOWER(:search)
          OR LOWER(author.name) LIKE LOWER(:search)
          OR LOWER(genre.name) LIKE LOWER(:search))`,
        { search: `%${search}%` },
      );
    }

    if (status) {
      query.andWhere('manga.status = :status', { status });
    }

    if (authors && authors.length > 0) {
      const conditions = authors.map(
        (_, i) => `LOWER(author.name) LIKE LOWER(:author_${i})`,
      );
      const params = authors.reduce(
        (acc, name, i) => ({ ...acc, [`author_${i}`]: `%${name}%` }),
        {} as Record<string, string>,
      );
      query.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    if (genres && genres.length > 0) {
      const conditions = genres.map(
        (_, i) => `LOWER(genre.name) LIKE LOWER(:genre_${i})`,
      );
      const params = genres.reduce(
        (acc, name, i) => ({ ...acc, [`genre_${i}`]: `%${name}%` }),
        {} as Record<string, string>,
      );
      query.andWhere(`(${conditions.join(' OR ')})`, params);
    }

    query
      .orderBy('manga.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

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
    if (data.coverKey !== undefined) manga.coverKey = data.coverKey;
    if (data.authors !== undefined) manga.authors = data.authors;
    if (data.genres !== undefined) manga.genres = data.genres;

    return await this.repo.save(manga);
  };

  delete = async (id: number): Promise<boolean> => {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
