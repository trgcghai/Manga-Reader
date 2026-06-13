import { Injectable } from '@nestjs/common';
import { LanguageRepository } from './language.repository';

@Injectable()
export class LanguageService {
  constructor(private readonly languageRepository: LanguageRepository) {}

  findAll = async () => {
    return await this.languageRepository.findAll();
  };
}
