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
      where: { name: name.trim() },
    });
  };

  create = async (data: Partial<Author>): Promise<Author> => {
    return await this.repo.save(data);
  };

  findAll = async (
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Author[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.repo.createQueryBuilder('author');
    qb.loadRelationCountAndMap('author.mangaCount', 'author.mangas');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    qb.orderBy('author.name', 'ASC');

    if (search) {
      qb.where('author.name ILIKE :search', { search: `%${search}%` });
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

  findOneById = async (id: number): Promise<Author | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  update = async (
    id: number,
    data: Partial<Author>,
  ): Promise<Author | null> => {
    const author = await this.repo.findOne({ where: { id } });
    if (!author) return null;

    if (data.name !== undefined) author.name = data.name;

    return await this.repo.save(author);
  };

  delete = async (id: number): Promise<boolean> => {
    await this.repo.manager.query(
      'DELETE FROM "manga_authors" WHERE "author_id" = $1',
      [id],
    );
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
