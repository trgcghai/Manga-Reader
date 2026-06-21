import { InjectRepository } from '@nestjs/typeorm';
import { Chapter } from 'src/modules/manga/entities/chapter.entity';
import { LessThan, MoreThan, Repository } from 'typeorm';

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

  findAdjacent = async (
    mangaId: number,
    currentNumber: number,
    direction: 'prev' | 'next',
  ): Promise<Chapter | null> => {
    const operator = direction === 'prev' ? LessThan : MoreThan;
    const order: 'DESC' | 'ASC' = direction === 'prev' ? 'DESC' : 'ASC';

    return await this.repo.findOne({
      where: { manga: { id: mangaId }, number: operator(currentNumber) },
      order: { number: order },
      relations: [
        'translations',
        'translations.language',
        'translations.translator',
      ],
    });
  };
}
