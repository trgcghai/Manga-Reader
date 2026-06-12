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
  ): Promise<{ data: Manga[]; total: number }> => {
    const [data, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['authors', 'genres'],
    });
    return { data, total };
  };

  findOneById = async (id: number): Promise<Manga | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  create = async (data: Partial<Manga>): Promise<Manga> => {
    return await this.repo.save(data);
  };

  findOneByIdWithRelations = async (id: number): Promise<Manga | null> => {
    return await this.repo.findOne({
      where: { id },
      relations: ['authors', 'genres'],
    });
  };

  update = async (id: number, data: Partial<Manga>): Promise<Manga | null> => {
    const manga = await this.repo.preload({ id, ...data });
    if (!manga) return null;
    return await this.repo.save(manga);
  };

  delete = async (id: number): Promise<boolean> => {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
