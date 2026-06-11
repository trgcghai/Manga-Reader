import { InjectRepository } from '@nestjs/typeorm';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { Repository } from 'typeorm';

export class MangaRepository {
  constructor(
    @InjectRepository(Manga)
    private readonly repo: Repository<Manga>,
  ) {}

  findAll = async (): Promise<Manga[]> => {
    return await this.repo.find();
  };

  findOneById = async (id: number): Promise<Manga | null> => {
    return await this.repo.findOne({ where: { id } });
  };
}
