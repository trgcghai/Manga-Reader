import { Injectable, NotFoundException } from '@nestjs/common';
import { Manga } from 'src/modules/manga/entities/manga.entity';
import { MangaRepository } from 'src/modules/manga/manga.repository';

@Injectable()
export class MangaService {
  constructor(private readonly mangaRepository: MangaRepository) {}

  findAll = async (): Promise<Manga[]> => {
    return await this.mangaRepository.findAll();
  };

  findOne = async (id: number): Promise<Manga> => {
    const result = await this.mangaRepository.findOneById(id);
    if (!result) {
      throw new NotFoundException(`Manga with ID ${id} not found`);
    }
    return result;
  };
}
