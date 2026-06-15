import { InjectRepository } from '@nestjs/typeorm';
import { Translator } from 'src/modules/translator/entities/translator.entity';
import { Repository } from 'typeorm';

export class TranslatorRepository {
  constructor(
    @InjectRepository(Translator)
    private readonly repo: Repository<Translator>,
  ) {}

  findOneByName = async (name: string): Promise<Translator | null> => {
    return await this.repo.findOne({
      where: { name: name.trim() },
    });
  };

  create = async (data: Partial<Translator>): Promise<Translator> => {
    return await this.repo.save(data);
  };

  findAll = async (
    search?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: Translator[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> => {
    const qb = this.repo.createQueryBuilder('translator');
    qb.skip((page - 1) * limit);
    qb.take(limit);
    qb.orderBy('translator.name', 'ASC');

    if (search) {
      qb.where('translator.name ILIKE :search', { search: `%${search}%` });
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

  findOneById = async (id: number): Promise<Translator | null> => {
    return await this.repo.findOne({ where: { id } });
  };

  update = async (
    id: number,
    data: Partial<Translator>,
  ): Promise<Translator | null> => {
    const translator = await this.repo.findOne({ where: { id } });
    if (!translator) return null;

    if (data.name !== undefined) translator.name = data.name;
    if (data.note !== undefined) translator.note = data.note;

    return await this.repo.save(translator);
  };

  delete = async (id: number): Promise<boolean> => {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  };
}
