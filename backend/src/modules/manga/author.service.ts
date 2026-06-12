import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorRepository } from './author.repository';
import { CreateAuthorDto } from 'src/modules/manga/dto/create-author.dto';
import { UpdateAuthorDto } from 'src/modules/manga/dto/update-author.dto';

@Injectable()
export class AuthorService {
  constructor(private readonly authorRepository: AuthorRepository) {}

  findAll = async (search?: string, page?: number, limit?: number) => {
    return await this.authorRepository.findAll(search, page, limit);
  };

  findOne = async (id: number) => {
    const author = await this.authorRepository.findOneById(id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    return author;
  };

  create = async (dto: CreateAuthorDto) => {
    const existing = await this.authorRepository.findOneByName(dto.name);
    if (existing) {
      throw new BadRequestException(`Author "${dto.name}" already exists`);
    }
    return await this.authorRepository.create({ name: dto.name });
  };

  update = async (id: number, dto: UpdateAuthorDto) => {
    const author = await this.authorRepository.findOneById(id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    if (dto.name && dto.name !== author.name) {
      const taken = await this.authorRepository.findOneByName(dto.name);
      if (taken) {
        throw new BadRequestException(`Author "${dto.name}" already exists`);
      }
    }

    return await this.authorRepository.update(id, dto);
  };

  delete = async (id: number) => {
    const author = await this.authorRepository.findOneById(id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    await this.authorRepository.delete(id);
  };
}
