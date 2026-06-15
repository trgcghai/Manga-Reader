import { InjectRepository } from '@nestjs/typeorm';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { Repository } from 'typeorm';

export class ChapterRepository {
  constructor(
    @InjectRepository(Chapter)
    private readonly repo: Repository<Chapter>,
  ) {}

  findByMangaAndNumber = async (
    mangaId: number,
    number: number,
  ): Promise<Chapter | null> => {
    return await this.repo.findOne({
      where: { manga: { id: mangaId }, number },
      relations: [
        'translations',
        'translations.language',
        'translations.translator',
      ],
    });
  };

  create = async (data: Partial<Chapter>): Promise<Chapter> => {
    return await this.repo.save(data);
  };
}
