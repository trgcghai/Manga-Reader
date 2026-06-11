import { InjectRepository } from '@nestjs/typeorm';
import { Author } from 'src/modules/manga/entities/author.entity';
import { Repository } from 'typeorm';

export class AuthorRepository {
  constructor(
    @InjectRepository(Author)
    private readonly repo: Repository<Author>,
  ) {}

  findOneByName = async (name: string): Promise<Author | null> => {
    return await this.repo.findOne({
      where: { name: name.trim().toLowerCase() },
    });
  };

  create = async (data: Partial<Author>): Promise<Author> => {
    return await this.repo.save(data);
  };
}
