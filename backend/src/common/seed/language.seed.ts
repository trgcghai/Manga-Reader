import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from 'src/modules/language/entities/language.entity';
import { LANGUAGE_SEED } from 'src/common/constants/language.constant';

@Injectable()
export class LanguageSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Language)
    private readonly repo: Repository<Language>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(LANGUAGE_SEED);
    }
  }
}
