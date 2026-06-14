import { Injectable, NotFoundException } from '@nestjs/common';
import { LanguageRepository } from './language.repository';

@Injectable()
export class LanguageService {
  constructor(private readonly languageRepository: LanguageRepository) {}

  findAll = async () => {
    return await this.languageRepository.findAll();
  };

  findOne = async (id: number) => {
    const language = await this.languageRepository.findOneById(id);
    if (!language) {
      throw new NotFoundException('Language with ID ' + id + ' not found');
    }
    return language;
  };
}
