import { InjectRepository } from '@nestjs/typeorm';
import { Genre } from 'src/modules/manga/entities/genre.entity';
import { Repository } from 'typeorm';

export class GenreRepository {
  constructor(
    @InjectRepository(Genre)
    private readonly repo: Repository<Genre>,
  ) {}

  findOneByName = async (name: string): Promise<Genre | null> => {
    return await this.repo.findOne({
      where: { name: name.trim().toLowerCase() },
    });
  };

  create = async (data: Partial<Genre>): Promise<Genre> => {
    return await this.repo.save(data);
  };
}
