import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GenreRepository } from './genre.repository';
import { CreateGenreDto } from 'src/modules/genre/dto/create-genre.dto';
import { UpdateGenreDto } from 'src/modules/genre/dto/update-genre.dto';
import { Genre } from 'src/modules/genre/entities/genre.entity';

@Injectable()
export class GenreService {
  constructor(private readonly genreRepository: GenreRepository) {}

  findAll = async (search?: string, page?: number, limit?: number) => {
    return await this.genreRepository.findAll(search, page, limit);
  };

  findOne = async (id: number) => {
    const genre = await this.genreRepository.findOneById(id);
    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }
    return genre;
  };

  findOrCreate = async (name: string): Promise<Genre> => {
    let genre = await this.genreRepository.findOneByName(name);
    if (!genre) {
      genre = await this.genreRepository.create({ name });
    }
    return genre;
  };

  create = async (dto: CreateGenreDto) => {
    const existing = await this.genreRepository.findOneByName(dto.name);
    if (existing) {
      throw new BadRequestException(`Genre "${dto.name}" already exists`);
    }
    return await this.genreRepository.create({ name: dto.name });
  };

  update = async (id: number, dto: UpdateGenreDto) => {
    const genre = await this.genreRepository.findOneById(id);
    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }

    if (dto.name && dto.name !== genre.name) {
      const taken = await this.genreRepository.findOneByName(dto.name);
      if (taken) {
        throw new BadRequestException(`Genre "${dto.name}" already exists`);
      }
    }

    return await this.genreRepository.update(id, dto);
  };

  delete = async (id: number) => {
    const genre = await this.genreRepository.findOneById(id);
    if (!genre) {
      throw new NotFoundException(`Genre with ID ${id} not found`);
    }
    await this.genreRepository.delete(id);
  };
}
