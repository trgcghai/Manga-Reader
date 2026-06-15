import { InjectRepository } from '@nestjs/typeorm';
import { Translation } from 'src/modules/manga/entities/translation.entity';
import { Repository } from 'typeorm';

export class TranslationRepository {
  constructor(
    @InjectRepository(Translation)
    private readonly repo: Repository<Translation>,
  ) {}

  findByChapterAndLanguageAndTranslator = async (
    chapterId: number,
    languageId: number,
    translatorId: number,
  ): Promise<Translation | null> => {
    return await this.repo.findOne({
      where: {
        chapter: { id: chapterId },
        language: { id: languageId },
        translator: { id: translatorId },
      },
    });
  };

  create = async (data: Partial<Translation>): Promise<Translation> => {
    return await this.repo.save(data);
  };

  findById = async (id: number): Promise<Translation | null> => {
    return await this.repo.findOne({
      where: { id },
      relations: ['chapter', 'chapter.manga'],
    });
  };

  update = async (id: number, data: Partial<Translation>): Promise<Translation | null> => {
    await this.repo.update(id, data);
    return await this.repo.findOne({ where: { id } });
  };

  delete = async (id: number): Promise<void> => {
    await this.repo.delete(id);
  };
}
