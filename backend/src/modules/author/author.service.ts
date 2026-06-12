import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorRepository } from './author.repository';
import {
  CreateAuthorDto,
  UpdateAuthorDto,
} from 'src/modules/author/dto/author.dto';
import { Author } from 'src/modules/author/entities/author.entity';

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

  findOrCreate = async (name: string): Promise<Author> => {
    let author = await this.authorRepository.findOneByName(name);
    if (!author) {
      author = await this.authorRepository.create({ name });
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
