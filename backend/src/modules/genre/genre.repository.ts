import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from 'src/modules/genre/entities/genre.entity';
import { Repository } from 'typeorm';

export class GenreRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly repo: Repository<Genre>,
  ) {}

  findOneByName = async (name: string): Promise<Genre | null> => {
    return await this.repo.findOne({
      where: { name: name.trim() },
    });
  };

  create = async (data: Partial<Genre>): Promise<Genre> => {
    return await this.repo.save(data);
  };

  findAll = async (
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Genre[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.repo.createQueryBuilder('genre');
    qb.loadRelationCountAndMap('genre.mangaCount', 'genre.mangas');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    qb.orderBy('genre.name', 'ASC');

    if (search) {
      qb.where('genre.name ILIKE :search', { search: `%${search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  };

  findOneById = async (id: number): Promise<Genre | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  update = async (
    id: number,
    data: Partial<Genre>,
  ): Promise<Genre | null> => {
    const genre = await this.repo.findOne({ where: { id } });
    if (!genre) return null;

    if (data.name !== undefined) genre.name = data.name;

    return await this.repo.save(genre);
  };

  delete = async (id: number): Promise<boolean> => {
    await this.repo.manager.query(
      'DELETE FROM "manga_genres" WHERE "genre_id" = $1',
      [id],
    );
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
