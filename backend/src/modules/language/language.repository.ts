import { InjectRepository } from '@nestjs/typeorm';
import { Language } from 'src/modules/language/entities/language.entity';
import { Repository } from 'typeorm';

export class LanguageRepository {
  constructor(
    @InjectRepository(Language)
    private readonly repo: Repository<Language>,
  ) {}

  findAll = async (): Promise<Language[]> => {
    return await this.repo.find();
  };
}
